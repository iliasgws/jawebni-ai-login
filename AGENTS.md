# AGENTS.md

## Project Overview

`jawebni-ai-login` — obfuscated delivery-link portal with an admin link generator (Node.js >= 20, ESM, no framework).

- Run: `npm start` / `npm dev` (`node --watch server.js`)
- Syntax check: `npm run check`

## Task Management

IMPORTANT: These are mandatory workflow rules.

- For EVERY non-trivial request involving multiple steps, files, components, bugs, or implementation work, you MUST use OpenCode's built-in `todowrite` tool.
- Do NOT merely write a Markdown checklist in the chat. Use the actual `todowrite` tool so the OpenCode task panel stays synchronized.
- Create the task list BEFORE starting implementation.
- Break the work into concrete, verifiable tasks.
- Tasks must represent actual implementation steps, not vague descriptions.
- Keep the task list dynamically synchronized with the work throughout the entire session.
- Before starting a task, mark it `in_progress`.
- There should normally be only ONE `in_progress` task at a time.
- As soon as a task is actually finished and verified, immediately mark it `completed`.
- Do NOT wait until the end of the request to mark several tasks completed at once.
- If implementation reveals additional required work, immediately add new tasks to the todo list.
- If a task becomes unnecessary, remove/cancel it rather than leaving stale work in the list.
- If the user changes the requirements, immediately update/reorder the todo list before continuing.
- Never mark a task completed merely because code was written. Verification must be finished first.
- Testing, linting, typechecking, build verification, and UI verification should appear as explicit tasks when relevant.
- Bug fixes must include reproduction/diagnosis, implementation, and verification tasks when appropriate.
- UI work must include final visual/interaction verification when relevant.
- Do not abandon the todo list midway through implementation.
- Before giving the final response, inspect the todo list and ensure there are no incorrectly pending or in-progress tasks.
- If work remains unfinished, leave those tasks visibly pending and explicitly explain why.
- The todo list is the authoritative execution plan for the current request.

## Required Workflow

For any meaningful coding request, follow this sequence:

```
USER REQUEST
↓
Understand requirements
↓
Inspect relevant code if necessary
↓
CREATE/UPDATE TODO LIST USING `todowrite`
↓
Mark first task `in_progress`
↓
Implement
↓
Verify that task
↓
Immediately mark it `completed`
↓
Mark next task `in_progress`
↓
Continue
↓
Add/revise tasks dynamically when discoveries are made
↓
Run final verification
↓
Complete final task
↓
Respond to user
```

Never skip the todo-list step because a task "looks simple" if it actually involves several implementation actions.

## Anti-Forgetting Rule

At the beginning of EACH new user request, explicitly determine:

"Does this require more than one meaningful action?"

If YES: IMMEDIATELY call `todowrite` before implementation.

During implementation, after every meaningful completed milestone, ask internally:

"Does the todo list accurately represent the current state of the work?"

If NO: update it immediately with `todowrite`.

This is not optional.

## Do Not Fake Task Tracking

The following are NOT acceptable substitutes for the real task list:

- Writing "TODO:"
- Markdown checkboxes in your response
- Describing what you intend to do without invoking the tool
- Creating tasks only after implementation has already started
- Creating the entire list at the start and never updating statuses
- Marking every task completed in one batch at the end

The actual OpenCode task list must change live as work progresses.
