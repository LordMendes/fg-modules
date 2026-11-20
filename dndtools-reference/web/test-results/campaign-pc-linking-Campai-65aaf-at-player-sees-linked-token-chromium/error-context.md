# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: campaign-pc-linking.spec.ts >> Campaign PC Token/Combatant Linking >> DM places PC token, adds party to combat, player sees linked token
- Location: e2e/campaign-pc-linking.spec.ts:10:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - link "Skip to main content" [ref=e11] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e12]:
    - generic [ref=e13]:
      - link "⚔ DnD Helper" [ref=e14] [cursor=pointer]:
        - /url: /
        - generic [ref=e15]: ⚔
        - generic [ref=e16]: DnD Helper
      - navigation "Primary navigation" [ref=e17]:
        - button "Browse" [ref=e19] [cursor=pointer]
        - link "Feats" [ref=e22] [cursor=pointer]:
          - /url: /feats
        - link "Spells" [ref=e23] [cursor=pointer]:
          - /url: /spells
        - link "Classes" [ref=e24] [cursor=pointer]:
          - /url: /classes
        - link "Monsters" [ref=e25] [cursor=pointer]:
          - /url: /monsters
        - link "Tools" [ref=e26] [cursor=pointer]:
          - /url: /tools
        - link "Sources" [ref=e27] [cursor=pointer]:
          - /url: /sources
        - link "Goods" [ref=e28] [cursor=pointer]:
          - /url: /stores/goods
      - generic [ref=e29]:
        - button "Search the archives" [ref=e30] [cursor=pointer]:
          - generic [ref=e34]: Search
          - generic [aria-hidden] [ref=e35]: Ctrl+K
        - generic [ref=e36]:
          - link "Log in" [ref=e37] [cursor=pointer]:
            - /url: /login
          - link "Sign up" [ref=e38] [cursor=pointer]:
            - /url: /register
          - button "Switch to dark theme" [ref=e39] [cursor=pointer]
  - main [ref=e42]:
    - generic [ref=e43]:
      - img "A wizard comforting a sad dragon in a cluttered magical study" [ref=e45]
      - generic [ref=e46]:
        - paragraph [aria-hidden] [ref=e47]: "404"
        - heading "Page not found" [level=1] [ref=e48]
        - paragraph [ref=e49]: The page you requested does not exist or may have been moved.
        - generic [ref=e50]:
          - link "Return home" [ref=e51] [cursor=pointer]:
            - /url: /
          - link "Search" [ref=e52] [cursor=pointer]:
            - /url: /search
          - navigation "Helpful links" [ref=e53]:
            - list [ref=e54]:
              - listitem [ref=e55]:
                - link "Spells" [ref=e56] [cursor=pointer]:
                  - /url: /spells
              - listitem [ref=e57]:
                - link "Feats" [ref=e58] [cursor=pointer]:
                  - /url: /feats
              - listitem [ref=e59]:
                - link "Monsters" [ref=e60] [cursor=pointer]:
                  - /url: /monsters
              - listitem [ref=e61]:
                - link "Classes" [ref=e62] [cursor=pointer]:
                  - /url: /classes
              - listitem [ref=e63]:
                - link "Skills" [ref=e64] [cursor=pointer]:
                  - /url: /skills
              - listitem [ref=e65]:
                - link "Races" [ref=e66] [cursor=pointer]:
                  - /url: /races
  - contentinfo [ref=e67]:
    - paragraph [ref=e68]: D&D 3.5 Edition reference material. Not affiliated with Wizards of the Coast.
    - paragraph [ref=e69]:
      - link "About" [ref=e70] [cursor=pointer]:
        - /url: /about
      - generic [aria-hidden] [ref=e71]: ·
      - link "Changelog" [ref=e72] [cursor=pointer]:
        - /url: /changelog
      - generic [aria-hidden] [ref=e73]: ·
      - link "Privacy" [ref=e74] [cursor=pointer]:
        - /url: /privacy
      - generic [aria-hidden] [ref=e75]: ·
      - link "llms.txt" [ref=e76] [cursor=pointer]:
        - /url: /llms.txt
      - generic [aria-hidden] [ref=e77]: ·
      - button "Cookie settings" [ref=e78] [cursor=pointer]
  - dialog "Cookies on DnD Helper" [ref=e79]:
    - generic [ref=e80]:
      - generic [ref=e81]:
        - heading "Cookies on DnD Helper" [level=2] [ref=e82]
        - paragraph [ref=e83]: We use necessary cookies for sign-in and site features. With your permission, we also load privacy-friendly analytics to understand how the site is used.
        - paragraph [ref=e84]:
          - link "Privacy policy" [ref=e85] [cursor=pointer]:
            - /url: /privacy
          - button "Manage preferences" [ref=e86] [cursor=pointer]
      - generic [ref=e87]:
        - button "Reject non-essential" [ref=e88] [cursor=pointer]
        - button "Customize" [ref=e89] [cursor=pointer]
        - button "Accept all" [ref=e90] [cursor=pointer]
  - alert [ref=e91]
```