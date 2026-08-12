export interface Chapter {
  id: string;
  title: string;
  body: string;
}

export interface Project {
  slug: string;
  title: string;
  hook: string;
  year: number;
  role: string;
  tags: string[];
  order: number;
  /** Tints the card placeholder until real photography exists. */
  accent: string;
  chapters: Chapter[];
}

export const projects: Project[] = [
  {
    slug: 'shape-of-time',
    title: 'The Shape of Time',
    hook: 'Twenty-four shapes for twenty-four stages of life — horology sold as a feeling, not a product.',
    year: 2026,
    role: "Master's Project",
    tags: ['Research', 'Editorial', 'Print', 'Horology'],
    order: 1,
    accent: '#e8c96b',
    chapters: [
      {
        id: 'problem',
        title: 'The problem',
        body: `The empathy of shapes has always intrigued me — why certain forms carry certain feelings. That question became the basis of my year-long Master's project.

I wanted to understand whether design could sell horology not as a product, but as an emotion — something you feel across a lifetime, not just read on a dial.`,
      },
      {
        id: 'insight',
        title: 'The insight',
        body: `I mapped human life to time itself. According to research, human life spans around 70 to 73 years. I treated a day as a metaphor: 24 hours, 24 stages of life — with each hour representing roughly three years.

I assigned emotions to each stage — from Birth and Eager, through Love and Stability, to Acceptance and beyond. Then I connected each emotion to a watch part whose shape matched that feeling.

The timepiece became a generational artifact, not just a mechanism.`,
      },
      {
        id: 'process',
        title: 'The process',
        body: `Twenty-four shapes for twenty-four stages of life — each one mapped to the watch part whose form matches its emotion.

I built the final project around Jaeger-LeCoultre, an ultra-luxury watch brand known for some of the most complicated and beautiful watches in the world.

I represented day and night through colour, inverting the hour hand so it stayed visible against both. I split the transition from black to white into twelve shades of grey, spreading them across the day-night cycle. The watch face only shows twelve hours, so to cover all twenty-four, I let the light and dark backgrounds themselves carry the second cycle.`,
      },
      {
        id: 'outcome',
        title: 'The outcome',
        body: `I bound the book so it opens a full 360 degrees — recreating the circular motion of a watch hand.

As you move through the brochure, the colour shifts from dark to light and back to dark, mimicking the cycle of a day. The shapes and poem tie each time of day to a stage of life, binding the shapes, the life, and the hour together.

Together they tell the story of a life.`,
      },
      {
        id: 'dot',
        title: 'The dot',
        body: `Research became something you could hold and turn. Every shape had a reason. Every shade of grey carried time forward.

This project taught me that the most luxurious design isn't decoration — it's making someone feel the weight of a moment.`,
      },
    ],
  },
  {
    slug: 'line-of-control',
    title: 'Line of Control',
    hook: "A folded brochure where India and Pakistan's border emerges from the space between the words.",
    year: 2026,
    role: 'ISTD Submission',
    tags: ['Typography', 'Editorial', 'Print', 'Research'],
    order: 2,
    accent: '#e491c9',
    chapters: [
      {
        id: 'problem',
        title: 'The problem',
        body: `This was my submission for the International Society of Typographic Designers in the UK. The brief was built around lines — a deceptively simple starting point.

I needed a concept where typography wasn't just carrying information, but actively shaping meaning.`,
      },
      {
        id: 'insight',
        title: 'The insight',
        body: `This complex-fold brochure is the result of three months of in-depth research into how typography connects to emotion.

I chose the brief built around lines, then expanded it into a brochure tracing the events leading up to the 2016 Uri attack and India's response.

A line isn't only a mark on a map. It can live in the space between letterforms — and in the tension between two sides of a story.`,
      },
      {
        id: 'process',
        title: 'The process',
        body: `I spent three months researching how type carries emotion — weight, rhythm, spacing, and silence.

The complex fold structure is made to create the line of control between India and Pakistan from the negative space made by the text.

Along with the idea, I made a specifications sheet for print release that was required as a part of my submission.`,
      },
      {
        id: 'outcome',
        title: 'The outcome',
        body: `The final brochure uses fold and typography together: open it, and the line of control appears not as a drawn border, but as the gap the text creates.

History, geography, and emotion converge in a single printed object — precise enough for an ISTD submission, human enough to carry the weight of its subject.`,
      },
      {
        id: 'dot',
        title: 'The dot',
        body: `Typography can hold things that are hard to say out loud. The fold does the rest.

This project reminded me that restraint in design isn't emptiness — sometimes the most powerful line is the one you don't draw.`,
      },
    ],
  },
  {
    slug: 'interactive-brochure',
    title: 'Interactive HTML Brochure',
    hook: "A conference-ready digital brochure for Metal Power's spectrometer lineup.",
    year: 2026,
    role: 'Interaction Designer',
    tags: ['Interaction', 'Axure', 'HTML', 'B2B'],
    order: 3,
    accent: '#b835b0',
    chapters: [
      {
        id: 'problem',
        title: 'The problem',
        body: `Metal Power, a spectrometer manufacturer, needed a way to showcase their different machines at national and international conferences.

A printed brochure couldn't demonstrate capability. A static PDF couldn't invite exploration. Visitors at a booth needed something they could interact with — immediately.`,
      },
      {
        id: 'insight',
        title: 'The insight',
        body: `An interactive HTML brochure could travel to any conference, run on any screen, and let visitors explore the full machine range at their own pace.

The format had to feel polished enough for a global manufacturer, but flexible enough to update as the product line evolved.`,
      },
      {
        id: 'process',
        title: 'The process',
        body: `I designed a high-fidelity HTML package in Axure, supported by custom code snippets written with the help of AI.

Each machine needed clear hierarchy, readable specs, and smooth navigation — designed for someone standing at a booth with only a few minutes of attention.`,
      },
      {
        id: 'outcome',
        title: 'The outcome',
        body: `The result is a deployable HTML package built for conference use — interactive, portable, and ready to showcase Metal Power's spectrometer range on screen.

It bridges the gap between a sales sheet and a product demo: informative, engaging, and reusable across events.`,
      },
      {
        id: 'dot',
        title: 'The dot',
        body: `Design doesn't have to stop at the visual. When the audience is standing in front of a screen, interaction becomes part of the story.

This was my first real step into code-adjacent design — and it showed me how much more welcoming a brochure feels when you can explore it yourself.`,
      },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectsSorted(): Project[] {
  return [...projects].sort((a, b) => a.order - b.order);
}
