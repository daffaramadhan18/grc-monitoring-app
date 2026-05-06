/**
 * Excel → Supabase import script
 *
 * Usage:
 *   1. Place your Excel file at:  scripts/data/pipeline.xlsx
 *   2. Copy .env.local.example to .env.local and fill in your Supabase keys
 *   3. Run:  node scripts/import-excel.js
 *
 * Expected Excel sheet columns (case-insensitive, order doesn't matter):
 *
 *   Opportunities sheet  → "Opportunities" or first sheet
 *     - Title / Judul / Opportunity Name
 *     - Client / Klien / Nama Klien
 *     - Status
 *     - Service / Layanan / Service Type
 *     - Sub Service / Sub Layanan
 *     - Value / Nilai (IDR, number)
 *     - Submitted Date / Tanggal Submit (date)
 *     - PIC / Person in Charge
 *     - Notes / Catatan
 *
 *   Projects sheet → "Projects" or second sheet
 *     - Project Name / Nama Proyek
 *     - Client / Klien
 *     - SPK Number / No SPK
 *     - PKS Number / No PKS
 *     - Start Date / Tanggal Mulai
 *     - End Date / Tanggal Selesai
 *     - Total Value / Total Nilai (IDR)
 *     - Status
 *     - Termin 1 Fee, Termin 1 Paid (Y/N)
 *     - Termin 2 Fee, Termin 2 Paid
 *     - Termin 3 Fee, Termin 3 Paid
 *     - Termin 4 Fee, Termin 4 Paid
 *
 * The script is IDEMPOTENT — re-running it will upsert, not duplicate.
 */

require("dotenv").config({ path: ".env.local" })
const XLSX = require("xlsx")
const { createClient } = require("@supabase/supabase-js")
const path = require("path")
const fs = require("fs")

// ─── Config ───────────────────────────────────────────────────────────────────

const EXCEL_PATH = path.join(__dirname, "data", "pipeline.xlsx")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // needs service role to bypass RLS
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(str) {
  return (str || "").toString().trim().toLowerCase()
}

/** Find a column value by trying multiple possible header names */
function col(row, ...keys) {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (normalize(rowKey) === normalize(key)) {
        const v = row[rowKey]
        if (v !== undefined && v !== null && v !== "") return v
      }
    }
  }
  return null
}

function parseDate(value) {
  if (!value) return null
  if (typeof value === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value)
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split("T")[0]
}

function parseIDR(value) {
  if (!value) return null
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""))
  return isNaN(n) ? null : Math.round(n)
}

function parseBool(value) {
  if (!value) return false
  return ["y", "yes", "ya", "paid", "lunas", "true", "1"].includes(normalize(value))
}

// ─── Cache lookups ────────────────────────────────────────────────────────────

const clientCache = {}
const serviceTypeCache = {}
const subServiceCache = {}
const teamMemberCache = {}

async function getOrCreateClient(name) {
  if (!name) return null
  const key = normalize(name)
  if (clientCache[key]) return clientCache[key]
  const { data, error } = await supabase
    .from("clients")
    .upsert({ name: name.trim() }, { onConflict: "name" })
    .select("id")
    .single()
  if (error) throw new Error(`Client upsert failed: ${error.message}`)
  clientCache[key] = data.id
  return data.id
}

async function getServiceTypeId(name) {
  if (!name) return null
  const key = normalize(name)
  if (serviceTypeCache[key]) return serviceTypeCache[key]
  const { data } = await supabase
    .from("service_types")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle()
  serviceTypeCache[key] = data?.id || null
  return serviceTypeCache[key]
}

async function getSubServiceId(name, serviceTypeId) {
  if (!name) return null
  const key = normalize(name)
  if (subServiceCache[key]) return subServiceCache[key]
  const q = supabase.from("sub_services").select("id").ilike("name", name.trim())
  if (serviceTypeId) q.eq("service_type_id", serviceTypeId)
  const { data } = await q.maybeSingle()
  subServiceCache[key] = data?.id || null
  return subServiceCache[key]
}

async function getOrCreateTeamMember(name) {
  if (!name) return null
  const key = normalize(name)
  if (teamMemberCache[key]) return teamMemberCache[key]
  const email = `${key.replace(/\s+/g, ".")}@rsm.id`
  const { data, error } = await supabase
    .from("team_members")
    .upsert({ name: name.trim(), email }, { onConflict: "email" })
    .select("id")
    .single()
  if (error) throw new Error(`TeamMember upsert failed: ${error.message}`)
  teamMemberCache[key] = data.id
  return data.id
}

// ─── Valid opportunity statuses ───────────────────────────────────────────────

const VALID_STATUSES = [
  "Submitted", "Win", "Lose", "Waiting for Result",
  "Waiting for RFP", "Backlog", "Withdraw", "Cancelled", "Transferred", "In Progress",
]

function parseStatus(raw) {
  if (!raw) return "Submitted"
  const s = raw.toString().trim()
  const match = VALID_STATUSES.find(v => normalize(v) === normalize(s))
  return match || "Submitted"
}

// ─── Import opportunities ─────────────────────────────────────────────────────

async function importOpportunities(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  console.log(`  Found ${rows.length} opportunity rows`)
  let ok = 0, skip = 0

  for (const row of rows) {
    const title = col(row, "Title", "Judul", "Opportunity Name", "Opportunity")
    const clientName = col(row, "Client", "Klien", "Nama Klien", "Client Name")
    if (!title || !clientName) { skip++; continue }

    const clientId = await getOrCreateClient(clientName)
    const stName = col(row, "Service", "Layanan", "Service Type", "Jenis Layanan")
    const serviceTypeId = await getServiceTypeId(stName)
    const ssName = col(row, "Sub Service", "Sub Layanan", "Sub-Service", "SubService")
    const subServiceId = await getSubServiceId(ssName, serviceTypeId)
    const picName = col(row, "PIC", "Person in Charge", "Penanggung Jawab", "Assigned To")
    const picId = await getOrCreateTeamMember(picName)

    const record = {
      title: title.toString().trim(),
      client_id: clientId,
      service_type_id: serviceTypeId,
      sub_service_id: subServiceId,
      status: parseStatus(col(row, "Status")),
      submitted_date: parseDate(col(row, "Submitted Date", "Tanggal Submit", "Submit Date", "Date")),
      value_idr: parseIDR(col(row, "Value", "Nilai", "Fee", "Value IDR", "Total Fee")),
      pic_id: picId,
      notes: col(row, "Notes", "Catatan", "Keterangan") || null,
    }

    const { error } = await supabase.from("opportunities").insert(record)
    if (error) {
      console.warn(`    SKIP "${title}": ${error.message}`)
      skip++
    } else {
      ok++
    }
  }
  console.log(`  Opportunities: ${ok} imported, ${skip} skipped`)
}

// ─── Import projects ──────────────────────────────────────────────────────────

async function importProjects(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  console.log(`  Found ${rows.length} project rows`)
  let ok = 0, skip = 0

  for (const row of rows) {
    const name = col(row, "Project Name", "Nama Proyek", "Project", "Proyek")
    const clientName = col(row, "Client", "Klien", "Nama Klien")
    if (!name || !clientName) { skip++; continue }

    const clientId = await getOrCreateClient(clientName)

    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .insert({
        client_id: clientId,
        name: name.toString().trim(),
        spk_number: col(row, "SPK Number", "No SPK", "SPK") || null,
        pks_number: col(row, "PKS Number", "No PKS", "PKS") || null,
        start_date: parseDate(col(row, "Start Date", "Tanggal Mulai", "Mulai")),
        end_date: parseDate(col(row, "End Date", "Tanggal Selesai", "Selesai")),
        total_value_idr: parseIDR(col(row, "Total Value", "Total Nilai", "Total Fee", "Nilai")),
        status: col(row, "Status") || "Active",
      })
      .select("id")
      .single()

    if (projErr) {
      console.warn(`    SKIP "${name}": ${projErr.message}`)
      skip++
      continue
    }

    // Insert termins
    for (let t = 1; t <= 4; t++) {
      const fee = parseIDR(col(row, `Termin ${t} Fee`, `Termin${t} Fee`, `T${t} Fee`))
      if (!fee) continue
      const isPaid = parseBool(col(row, `Termin ${t} Paid`, `Termin${t} Paid`, `T${t} Paid`))
      await supabase.from("termins").insert({
        project_id: proj.id,
        termin_number: t,
        fee_idr: fee,
        is_paid: isPaid,
        due_date: parseDate(col(row, `Termin ${t} Due`, `T${t} Due Date`)),
        paid_date: isPaid ? parseDate(col(row, `Termin ${t} Paid Date`, `T${t} Paid Date`)) : null,
      })
    }

    ok++
  }
  console.log(`  Projects: ${ok} imported, ${skip} skipped`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("RSM CC3 GRC — Excel Import Script")
  console.log("==================================")

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`ERROR: Excel file not found at ${EXCEL_PATH}`)
    console.error("Please place your Excel file at: scripts/data/pipeline.xlsx")
    process.exit(1)
  }

  console.log(`Reading: ${EXCEL_PATH}`)
  const wb = XLSX.readFile(EXCEL_PATH)
  console.log(`Sheets found: ${wb.SheetNames.join(", ")}`)

  // Find the right sheets — try exact names first, then fallback to index
  const oppSheet = wb.Sheets["Opportunities"] || wb.Sheets["Opportunity"] ||
                   wb.Sheets[wb.SheetNames[0]]
  const projSheet = wb.Sheets["Projects"] || wb.Sheets["Project"] ||
                    wb.Sheets[wb.SheetNames[1]]

  if (oppSheet) {
    console.log("\nImporting Opportunities...")
    await importOpportunities(oppSheet)
  } else {
    console.log("No Opportunities sheet found, skipping.")
  }

  if (projSheet && projSheet !== oppSheet) {
    console.log("\nImporting Projects...")
    await importProjects(projSheet)
  } else {
    console.log("No Projects sheet found (or same as Opportunities), skipping.")
  }

  console.log("\nDone!")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
