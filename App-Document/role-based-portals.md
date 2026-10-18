# Role-Based Portals (App-WebUI)

**Not applicable to Thakurg.** This site has no login, roles or separate portals: every page is public, and the only protected actions (adding, deleting and changing the password of a music player's songs) are protected by a per-player password checked by the API (`X-Edit-Password`, `X-Master-Key`), not by a role.

If roles or portals are introduced later, replace this file with the rule for them. Until then, no code change is required by this document.
