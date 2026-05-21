import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // ─── Team Members ───────────────────────────────────────────────────────────
  const teamMembers = [
    { initial: "ALX", fullName: "Dian P. Rahmasari", level: "SM1" },
    { initial: "DSA", fullName: "Dena Sucianandika", level: "M3" },
    { initial: "RON", fullName: "Rona Febriana", level: "AM1" },
    { initial: "JS",  fullName: "Jovanke Surja", level: "SA3" },
    { initial: "GBR", fullName: "Gusti B. R. Francolla", level: "SA2" },
    { initial: "NS",  fullName: "Nisita Sarinarulita", level: "SA2" },
    { initial: "DR",  fullName: "Daffa Ramadhan", level: "SA1" },
    { initial: "PE",  fullName: "Putri Effendi", level: "SA1" },
    { initial: "CP",  fullName: "Carissa Putri", level: "A1" },
    { initial: "DA",  fullName: "Danish Ahmad", level: "A1" },
    { initial: "RWN", fullName: "Richelle", level: "A1" },
    { initial: "MS",  fullName: "Michael Sean", level: "I" },
    { initial: "JL",  fullName: "Jessica Lambok", level: "I" },
    { initial: "MCS", fullName: "Michelle Caroline Sugianto", level: "A1" },
  ]

  for (const tm of teamMembers) {
    await prisma.teamMember.upsert({
      where: { initial: tm.initial },
      update: tm,
      create: tm,
    })
  }
  console.log(`Seeded ${teamMembers.length} team members`)

  // ─── Service Types + Sub-services ───────────────────────────────────────────
  const serviceData = [
    {
      name: "IT GRC",
      subs: [
        "IT Audit & Compliance",
        "LPS-SCV",
        "IT Maturity",
        "OT Audit",
        "MRTI",
        "IT Governance",
        "ISO",
        "Managed Service",
      ],
    },
    {
      name: "Privacy",
      subs: [],
    },
    {
      name: "Cybersecurity",
      subs: [
        "VAPT",
        "Red Teaming",
        "Cyber Maturity Assessment",
        "Managed Service",
      ],
    },
  ]

  for (const st of serviceData) {
    const serviceType = await prisma.serviceType.upsert({
      where: { name: st.name },
      update: {},
      create: { name: st.name },
    })
    for (const subName of st.subs) {
      const existing = await prisma.subService.findFirst({
        where: { name: subName, serviceTypeId: serviceType.id },
      })
      if (!existing) {
        await prisma.subService.create({
          data: { name: subName, serviceTypeId: serviceType.id },
        })
      }
    }
  }
  console.log("Seeded service types and sub-services")

  // ─── Default Admin User ─────────────────────────────────────────────────────
  const existingUser = await prisma.user.findUnique({ where: { username: 'daffa.ramadhan' } })
  if (!existingUser) {
    const hash = await bcrypt.hash('ITGRC@2026', 12)
    await prisma.user.create({
      data: {
        username:           'daffa.ramadhan',
        password:           hash,
        role:               'Senior Associate 1',
        isAdmin:            true,
        isActive:           true,
        mustChangePassword: false,
      },
    })
    console.log("Seeded default admin user: daffa.ramadhan")
  } else {
    await prisma.user.update({
      where: { username: 'daffa.ramadhan' },
      data: {
        role:               'Senior Associate 1',
        isAdmin:            true,
        isActive:           true,
        mustChangePassword: false,
      },
    })
    console.log("Updated daffa.ramadhan to new role schema")
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
