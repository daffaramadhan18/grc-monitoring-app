# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a personal repository for storing custom Claude Code skills — reusable prompt-driven workflows that extend Claude Code's capabilities via the `/skill-name` slash command interface.

## Repository Structure

Each skill lives in its own `.md` file at the root or in a `skills/` subdirectory. Skills are plain Markdown files that Claude Code reads and executes as guided workflows.

## Working with Skills

- **Add a skill**: Create a new `.md` file describing the workflow, inputs, and steps.
- **Test a skill**: Run it via Claude Code with `/skill-name` and verify the output matches intent.
- **Update a skill**: Edit the `.md` file directly; no build step needed.

## Conventions

- Skill filenames use `kebab-case` (e.g., `code-review.md`, `git-commit.md`).
- Each skill file should start with a brief one-line description of what it does.
- Keep skills focused on a single task — compose multiple skills for complex workflows.
