# Xano Studio templates and ideas

Xano Studio reads two files from this repository's default branch. A change here
shows in Studio within about ten minutes, with no Studio release.

## `templates.json`

The templates under **Start from a template**, in the order shown. Each entry:

| Field         | What it is                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `repo`        | `owner/name` of a public GitHub repository with a `package.json` that depends on `@xano/sdk`.     |
| `name`        | The name on the card, and the new app's name.                                                   |
| `description` | One line under the name.                                                                        |
| `image`       | The card's picture: a path in this repository (such as `images/commons-light.svg`) or an `https://` URL. Shown at 15:8, so 480×256 works well. |
| `imageDark`   | The same picture for Studio's dark theme. Without it, `image` is used in both.                  |
| `signature`   | The drawing Studio shows when there is no `image`, or it does not load: `kanban`, `calendar`, `map`, `dashboard`, `library`, `document`. |
| `prompt`      | Put in the message box when the app opens. It is not sent: the person edits it, then sends.     |

To change a card's picture, replace its file in `images/` (or point `image` at a new one). Only `repo` is required. A repository Studio cannot run is left out of the list.

## `ideas.json`

The prompts under **Ideas**, by what the app is for: `full` (a whole app),
`backend`, `mcp` (an MCP server) and `agent` (a Xano AI agent). Each entry:

| Field    | What it is                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------- |
| `label`  | The idea's name.                                                                                   |
| `detail` | One line under the name.                                                                           |
| `prompt` | Put in the message box when picked. It is not sent.                                                |
| `icon`   | Optional: `handshake`, `headset`, `briefcase`, `calendar`, `receipt`, `package`, `smartphone`, `credit-card`, `mail`, `book`, `contact`, `truck`, `target`, `notebook`, `bot`, `store`. |

Every released version of Studio reads these files, so only add ideas and
templates that any of them can build. If a file is missing or does not parse,
Studio shows its built-in ideas and no templates.
