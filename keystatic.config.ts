import { collection, config, fields, singleton } from '@keystatic/core';

/**
 * Brand palette only — a free colour picker is how a portfolio drifts off-brand.
 * These must stay in step with the tokens at the top of src/styles/global.css.
 */
const ACCENT_OPTIONS = [
  { label: 'Yellow', value: '#e8c96b' },
  { label: 'Pink', value: '#e491c9' },
  { label: 'Purple', value: '#982598' },
  { label: 'Orchid', value: '#b835b0' },
] as const;

/** Each value maps to a hand-drawn SVG in src/components/ThoughtIcons.astro. */
const THOUGHT_ICONS = [
  { label: 'Eye (read)', value: 'read' },
  { label: 'Heart (empathize)', value: 'empathize' },
  { label: 'Target (define)', value: 'define' },
  { label: 'Form (shape)', value: 'shape' },
  { label: 'Ripples (tell)', value: 'tell' },
] as const;

const prose = (label: string, description?: string) =>
  fields.text({
    label,
    description,
    multiline: true,
    validation: { isRequired: true },
  });

export default config({
  storage:
    // Local mode while developing, GitHub mode once deployed. Set PUBLIC_KEYSTATIC_GITHUB_REPO
    // in the Cloudflare dashboard as "owner/repo" to switch production over.
    import.meta.env.DEV || !import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO
      ? { kind: 'local' }
      : {
          kind: 'github',
          repo: import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as `${string}/${string}`,
        },

  ui: {
    brand: { name: 'Rithvik — Portfolio' },
    navigation: {
      Work: ['projects', 'workOrder'],
      Pages: ['home', 'about', 'contact'],
      'Interactive bits': ['thoughtProcess', 'fireflyPhrases'],
    },
  },

  collections: {
    projects: collection({
      label: 'Projects',
      path: 'src/content/projects/*/',
      format: { data: 'yaml' },
      // The folder name becomes the URL: /projects/<slug>
      slugField: 'title',
      columns: ['title', 'year'],
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
          slug: {
            label: 'URL slug',
            description: 'Appears in the address bar. Changing it breaks existing links.',
          },
        }),
        hook: prose('Hook', 'One or two lines. Shown on the work card and under the title.'),
        // Text, not integer: fields.integer renders 2026 as "2,026" in the editor.
        year: fields.text({
          label: 'Year',
          validation: {
            isRequired: true,
            pattern: { regex: /^\d{4}$/, message: 'Four digits, for example 2026' },
          },
        }),
        role: fields.text({ label: 'Role', validation: { isRequired: true } }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          description: 'The first tag shows on the work card placeholder.',
          itemLabel: (p) => p.value,
        }),
        accent: fields.select({
          label: 'Accent colour',
          description: 'Tints the card until a hero image is uploaded.',
          options: [...ACCENT_OPTIONS],
          defaultValue: '#e8c96b',
        }),
        heroImage: fields.image({
          label: 'Hero image',
          description: 'Optional. Without one, the card falls back to its typographic placeholder.',
          directory: 'public/images/projects',
          publicPath: '/images/projects/',
        }),
        chapters: fields.array(
          fields.object({
            title: fields.text({ label: 'Chapter title', validation: { isRequired: true } }),
            body: prose('Body', 'Leave a blank line between paragraphs.'),
          }),
          {
            label: 'Chapters',
            description: 'The story, told in order. Drag to reorder.',
            itemLabel: (p) => p.fields.title.value || 'Untitled chapter',
          },
        ),
      },
    }),
  },

  singletons: {
    workOrder: singleton({
      label: 'Work order',
      path: 'src/content/site/work-order',
      format: { data: 'yaml' },
      schema: {
        order: fields.array(
          fields.relationship({ label: 'Project', collection: 'projects' }),
          {
            label: 'Order shown on the home page',
            description:
              'Drag to reorder. Any project left out still appears, newest first, after these.',
            itemLabel: (p) => p.value ?? 'Pick a project',
          },
        ),
      },
    }),

    home: singleton({
      label: 'Home page',
      path: 'src/content/site/home',
      format: { data: 'yaml' },
      schema: {
        greeting: fields.text({ label: 'Greeting', defaultValue: "Hi! I'm" }),
        nameLead: fields.text({
          label: 'Name — letter carrying the dot',
          description: 'Just the one letter. The clickable dot hangs beneath it.',
          validation: { isRequired: true },
        }),
        nameRest: fields.text({
          label: 'Name — rest',
          validation: { isRequired: true },
        }),
        nameSpoken: fields.text({
          label: 'Name — as read aloud',
          description:
            'What screen readers announce. The visible name drops the "i" because the dot is the vocalic R, so this needs spelling out in full.',
          validation: { isRequired: true },
        }),
        pronunciation: fields.text({
          label: 'Pronunciation',
          description: 'Shown on hover and read out to screen readers.',
        }),
        tagline: prose('Tagline', 'Each line break becomes a new line.'),
        dotHint: fields.text({
          label: 'Dot hint',
          description: 'The small italic nudge that fades in under the tagline.',
        }),
        workTitle: fields.text({ label: 'Work — heading' }),
        workIntro: prose(
          'Work — intro',
          'Use {count} where the number of projects should appear.',
        ),
        workEmpty: fields.text({
          label: 'Work — text when there are no projects yet',
          defaultValue: 'New work is on its way.',
        }),
        capabilitiesTitle: fields.text({ label: 'What I do — heading' }),
        capabilitiesIntro: prose('What I do — intro'),
        capabilities: fields.array(
          fields.object({
            title: fields.text({ label: 'Title', validation: { isRequired: true } }),
            note: prose('Note'),
          }),
          { label: 'What I do', itemLabel: (p) => p.fields.title.value || 'Untitled' },
        ),
        bioText: prose('Bio strip', 'Wrap text in **asterisks** to bold it.'),
        bioLinkLabel: fields.text({ label: 'Bio strip — button' }),
      },
    }),

    about: singleton({
      label: 'About page',
      path: 'src/content/site/about',
      format: { data: 'yaml' },
      schema: {
        title: fields.text({ label: 'Heading', validation: { isRequired: true } }),
        body: prose(
          'Body',
          'Blank line between paragraphs. Wrap text in **asterisks** to bold it.',
        ),
        ctaLabel: fields.text({ label: 'Button label' }),
      },
    }),

    contact: singleton({
      label: 'Contact page',
      path: 'src/content/site/contact',
      format: { data: 'yaml' },
      schema: {
        title: fields.text({ label: 'Heading', validation: { isRequired: true } }),
        intro: prose('Intro'),
        email: fields.text({
          label: 'Email address',
          description: 'Used by the form, the footer, and the link below the form.',
          validation: { isRequired: true },
        }),
        asidePrefix: fields.text({ label: 'Text before the email link' }),
        submitLabel: fields.text({ label: 'Send button label' }),
      },
    }),

    thoughtProcess: singleton({
      label: 'Thought process',
      path: 'src/content/site/thought-process',
      format: { data: 'yaml' },
      schema: {
        beats: fields.array(
          fields.object({
            icon: fields.select({
              label: 'Icon',
              description: 'Only these five exist — a new one has to be drawn in code.',
              options: [...THOUGHT_ICONS],
              defaultValue: 'read',
            }),
            title: fields.text({ label: 'Title', validation: { isRequired: true } }),
            body: prose('Body'),
          }),
          {
            label: 'Beats',
            description: 'The overlay behind the dot. Drag to reorder.',
            itemLabel: (p) => p.fields.title.value || 'Untitled beat',
          },
        ),
      },
    }),

    fireflyPhrases: singleton({
      label: 'Firefly phrases',
      path: 'src/content/site/firefly-phrases',
      format: { data: 'yaml' },
      schema: {
        phrases: fields.array(fields.text({ label: 'Phrase' }), {
          label: 'Phrases',
          description:
            'One appears each time a firefly is caught. Keep them short — they float for about a second and a half.',
          itemLabel: (p) => p.value,
        }),
      },
    }),
  },
});
