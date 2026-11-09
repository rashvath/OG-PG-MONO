ponytail.md
AI Agent Development Rules & Engineering Standards

These rules must be followed whenever the AI agent creates, modifies, reviews, or refactors application code.

1. Component Architecture & Code Organization
Never write component implementation code inline when it can be maintained as a separate component or module.
Every component must have its own dedicated file wherever practical.
Keep components modular, reusable, readable, and maintainable.
Separate UI components, business logic, API services, hooks, utilities, types, and constants.
Avoid putting the entire application logic inside a single file.
Keep components focused on a single responsibility.
Extract repeated logic into reusable functions or hooks.
Ensure every component has all required dependencies, props, types, and configurations before considering it complete.
Do not leave placeholder implementations, incomplete functions, or unused code.
2. API Calls & Performance Optimization
Avoid unnecessary multiple API calls.
Before implementing an API integration, check whether an existing API service or function can be reused.
Do not call the same API repeatedly for identical data.
Reuse existing API responses wherever appropriate.
Use batching or combined endpoints when supported by the backend.
Implement debouncing for search inputs and frequently triggered requests.
Avoid triggering API calls on every render.
Prevent duplicate API requests caused by repeated component mounting or state changes.
Implement caching when appropriate.
Fetch only the data required by the current feature.
Handle loading, success, empty, and error states properly.
3. Bug Prevention & Quality Assurance
Every implemented feature must be reviewed for potential bugs before completion.
Check for null, undefined, empty, and unexpected values.
Handle API failures and network interruptions gracefully.
Prevent duplicate form submissions.
Prevent race conditions and unnecessary state updates.
Ensure event listeners, subscriptions, and resources are cleaned up properly.
Avoid memory leaks and infinite rendering loops.
Verify that existing features continue working after modifications.
Do not introduce breaking changes without checking their impact.
Remove console errors, warnings, unused imports, and dead code where possible.
4. UI Layout & Responsive Design
No UI overlapping is allowed.
Ensure components do not overlap, overflow, or become clipped unexpectedly.
Maintain consistent spacing, alignment, typography, and sizing.
Check layouts across mobile, tablet, laptop, and desktop screen sizes.
Avoid hardcoded dimensions when responsive layouts are more appropriate.
Ensure modals, dropdowns, tooltips, and popovers appear in the correct positions.
Verify proper z-index management.
Ensure buttons, inputs, labels, and other interactive elements remain accessible.
Handle long text, large content, and empty states without breaking the layout.
Maintain the existing design system and UI conventions.
5. Input Validation & Form Handling

Every user input must have appropriate validation before submission.

Examples:

Field	Validation rule
Phone number	Maximum 10 digits; exactly 10 digits when required
Email	Must follow valid email format
Name	Required where applicable; reject invalid input
Password	Enforce configured password requirements
OTP	Validate expected digit count
URL	Validate URL format
Numeric fields	Enforce minimum and maximum values
Required fields	Must not be empty
Text fields	Enforce appropriate maximum character limits

Additional rules:

Use both frontend and backend validation.
Never rely exclusively on frontend validation.
Trim unnecessary whitespace.
Prevent invalid characters where appropriate.
Display clear, field-specific validation messages.
Validate data types and formats before sending API requests.
Do not allow invalid form submissions.
Make validation consistent across the application.
Ensure validation does not interfere with legitimate user input.
6. Feature Implementation Requirements

Before marking any feature as completed:

Verify all required components are implemented.
Verify all dependencies and integrations are configured.
Verify API requests and response handling.
Verify all required props and data validations.
Verify loading, error, success, and empty states.
Verify responsive UI behavior.
Verify navigation and user interactions.
Verify edge cases and invalid input scenarios.
Verify that the feature does not break existing functionality.

A feature is not complete just because its UI is visible. Its complete functionality must work.

7. Code Quality Standards
Follow the existing project architecture and coding conventions.
Use meaningful variable, function, and component names.
Avoid unnecessary code duplication.
Avoid deeply nested conditional logic.
Use proper typing wherever the project supports TypeScript.
Avoid using any unless absolutely necessary.
Keep functions small and maintainable.
Use constants instead of repeating hardcoded values.
Remove unnecessary dependencies.
Do not change unrelated files or functionality.
8. Security & Data Integrity
Never expose API keys, secrets, or sensitive credentials in frontend code.
Validate and sanitize untrusted inputs appropriately.
Handle authentication and authorization correctly.
Do not expose sensitive user information in logs.
Never trust client-side data without server-side verification.
Follow secure API integration practices.
9. Mandatory Testing Checklist

Before completing any task, perform the applicable checks:

No compilation or build errors.
No runtime errors.
No unexpected console errors or warnings.
No UI overlapping or layout overflow.
No broken responsive layouts.
No duplicate or unnecessary API calls.
No invalid form submissions.
All required field validations work.
Loading and error states work.
All buttons and interactions work.
Existing functionality remains intact.
No unused imports or dead code.
Edge cases have been considered.
10. Final AI Agent Execution Rule

For every development task, follow this sequence:

Understand the existing project structure.
Inspect existing components, APIs, utilities, and dependencies.
Plan the implementation without unnecessary architectural changes.
Implement modular, reusable, and maintainable code.
Optimize API calls and state management.
Add proper frontend and backend validations.
Check UI responsiveness and overlapping issues.
Test the implemented functionality and relevant existing features.
Fix identified bugs before reporting completion.
Provide a concise summary of changes and any remaining limitations.
FINAL NON-NEGOTIABLE RULE

Never consider a feature complete simply because the code has been written.

The implementation must be functional, properly validated, responsive, optimized, reusable, and tested.

Do not introduce unnecessary API calls, inline component implementations, UI overlaps, missing validations, or avoidable bugs.

If a requirement cannot be fully implemented or tested, explicitly report it instead of claiming it is complete.