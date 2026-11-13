# ResumeNext

Cursor plugin that connects agents to [ResumeNext](https://resumenext.io) through eight hosted [Model Context Protocol](https://modelcontextprotocol.io/) servers.

ResumeNext gives the agent resume, cover letter and job application tools: an ATS score with the issues to fix first, a match against a job post, cover letter and LinkedIn reviews, bullet point and skills checks, and links that open the result in the ResumeNext editor. The tools need no account or sign-in.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **ResumeNext**.
3. Click **Install**. No account or sign-in is needed.

Or run `/add-plugin resumenext` in chat.

## MCP

```json
{
  "mcpServers": {
    "resumenext-ats-resume-checker": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/resume/mcp"
    },
    "resumenext-job-match": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/job-match/mcp"
    },
    "resumenext-cover-letter": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/cover-letter/mcp"
    },
    "resumenext-resignation-letter": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/resignation-letter/mcp"
    },
    "resumenext-linkedin-resume": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/linkedin/mcp"
    },
    "resumenext-resume-examples": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/resume-examples/mcp"
    },
    "resumenext-resume-bullet-points": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/bullet-points/mcp"
    },
    "resumenext-resume-skills": {
      "type": "http",
      "url": "https://resumenext.io/api/grok/resume-skills/mcp"
    }
  }
}
```

The servers need no authentication.

## What agents can do

| Server | Tools | Capabilities |
| --- | --- | --- |
| `resumenext-ats-resume-checker` | `analyze_resume`, `prepare_resume_editor` | ATS score out of 100, the issues to fix first, and a link that opens the resume in the ResumeNext builder |
| `resumenext-job-match` | `match_resume_to_job`, `prepare_tailored_resume` | Matched and missing keywords against a job post, a job-tailored ATS score, and an editable copy with the job attached |
| `resumenext-cover-letter` | `score_cover_letter`, `find_cover_letter_examples`, `prepare_cover_letter_editor` | Cover letter score out of 100 against a fixed checklist, example letters for the role, and the letter in the cover letter editor |
| `resumenext-resignation-letter` | `write_resignation_letter` | A resignation letter in a standard, formal or grateful style, ready to edit and save as PDF, DOCX or TXT |
| `resumenext-linkedin-resume` | `review_linkedin_profile`, `convert_linkedin_to_resume` | LinkedIn profile score for the role you want, what to fix first, and a resume built from the profile |
| `resumenext-resume-examples` | `find_resume_examples`, `list_resume_templates` | Resume examples for a role and the right template for a profile |
| `resumenext-resume-bullet-points` | `check_resume_bullets`, `find_action_verbs` | Bullet points checked line by line for action verbs, numbers and phrases to delete, and action verbs by type of work |
| `resumenext-resume-skills` | `find_resume_skills`, `check_resume_skills` | The skills recruiters expect for a role, and which ones the resume lists, shows in the work history, or misses |

The hosted runtime is the source of truth for tool names and schemas.

## Try it

- "Check my resume for ATS issues" (paste the resume text)
- "How well does my resume match this job post?" (paste both)
- "Score my cover letter for a product manager role"

## Pricing

The plugin and its tools are free and need no account or sign-in. Building and editing a resume in ResumeNext is free; downloading the finished resume as PDF or Word needs a ResumeNext Pro account.

## Data and privacy

Read-only tools process the text the agent sends and store nothing. A tool that creates a link stores the document you asked to open, for 7 days; opening the link saves it in your ResumeNext account or in a temporary account created for it. The plugin has no hooks or local scripts, calls no AI model, and receives only the text passed to a tool.

## Docs and support

- ResumeNext: https://resumenext.io
- How the connectors work: https://resumenext.io/mcp
- Privacy: https://resumenext.io/privacy
- Terms: https://resumenext.io/terms
- Contact: support@resumenext.io

Logo is the ResumeNext mark, rendered at 512×512 from the SVG in https://github.com/resumenext-io/cursor-plugins.

## License

MIT
