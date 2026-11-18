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
| `types`       | What it is a template of, for the type cards and the filter in the list: any of `full` (a whole app), `backend`, `mcp` (an MCP server), `agent` (a Xano AI agent). Without it, the template shows only under **All**. |
| `prompt`      | Put in the message box when the app opens. It is not sent: the person edits it, then sends.     |

To change a card's picture, replace its file in `images/` (or point `image` at a new one). Only `repo` is required. A repository Studio cannot run is left out of the list.

## `details/<name>.json`

What a template's detail page in Studio shows beyond its card: a paragraph about
it, a picture of the running app, how many screens, endpoints and tables it has,
and the canvas of its backend. One file per template, named after its repository
(`details/commons-team-workspace.json`). A template with no file still lists; its
page shows the card's picture and words.

Do not write these by hand. They are read from each template's own repository:

```sh
node scripts/gen-details.mjs
```

Run it after adding a template or when one changes, and commit what it writes.
The canvas has the same shape as `canvas.graph` on xano.com/templates.

## `ideas.json`

The prompts under **Ideas**. Ideas opens on the `categories`, in the order
listed; picking one shows its ideas. Each category:

| Field    | What it is                                              |
| -------- | ------------------------------------------------------- |
| `id`     | What an idea's `category` names. Do not use `more`.     |
| `label`  | The category's name.                                    |
| `detail` | One line under the name.                                |
| `icon`   | Optional: any idea icon, or `compass`, `rocket`, `users`, `plug`, `refresh`. |

The ideas are listed by what the app is for: `full` (a whole app), `backend`,
`mcp` (an MCP server) and `agent` (a Xano AI agent). A category shows for a
kind of app only when it has ideas of that kind. Each entry:

| Field      | What it is                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `label`    | The idea's name.                                                                                   |
| `detail`   | One line under the name.                                                                           |
| `prompt`   | Put in the message box when picked. It is not sent.                                                |
| `category` | The `id` of its category. Without one, or with one that is not listed, it shows last under **More ideas**. |
| `icon`     | Optional: `handshake`, `headset`, `briefcase`, `calendar`, `receipt`, `package`, `smartphone`, `credit-card`, `mail`, `book`, `contact`, `truck`, `target`, `notebook`, `bot`, `store`. |

Older versions of Studio ignore the categories and show each kind of app's
ideas as one list, in the order here, so keep the best ideas of each category
near its top.

Every released version of Studio reads these files, so only add ideas and
templates that any of them can build. If a file is missing or does not parse,
Studio shows its built-in ideas and no templates.
