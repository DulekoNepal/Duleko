// Build-time SEO content for scripts/seo-build.mjs: who runs Duleko, and a
// plain-HTML version of each public page for crawlers that don't run JS.
// Keep this in step with what the pages actually show (lib/i18n-site.ts and
// the About page) - search engines penalise text a visitor can't see.
// Titles and descriptions live in src/lib/seo-pages.json (the app uses them too).

export const organization = {
  name: "Duleko",
  alternateName: ["डुलेको", "Duleko Nepal"],
  slogan: "Your skills deserve an opportunity.",
  tagline: "Connecting local skills with local opportunities.",
  nepaliTagline: "सीपलाई अवसरसँग जोड्दै",
  description:
    "Duleko is a local skills marketplace for Nepal. It gives skilled people a free virtual space to showcase what they can do, and helps households, businesses and communities find and connect with them directly - without the cost of a physical shop.",
  email: "dulekonepal@gmail.com",
  foundingLocation: "Kapilvastu, Nepal",
  areaServed: "Nepal",
  languages: ["English", "Nepali"],
  // The person who founded Duleko - the only founder.
  founder: "sunil",
  // The person who designed and built the platform (web app, Android app, backend).
  builtBy: "sanjay",
};

export const team = [
  {
    id: "sunil",
    slug: "sunil-k-chaudhary",
    name: "Sunil K. Chaudhary",
    jobTitle: "Founder & Product Lead",
    image: "sunil",
    imageSize: [858, 1024],
    profilePath: "/worker/fc5757c4-cd73-4dc0-b3d6-441c4c1dad00",
    sameAs: [],
    homeLocation: "Kapilvastu, Nepal",
    affiliation: ["Haverford College", "University of Oxford", "University of Pennsylvania (Wharton)"],
    alumniOf: [],
    knowsAbout: ["Product Strategy", "Partnerships", "Community Development", "Mathematics", "Economics"],
    quote: "What if the opportunity you need is already somewhere around you?",
    bio: [
      "Growing up in Kapilvastu, Nepal, Sunil saw people searching for work while, often in the same communities, others struggled to find the right people for the work they needed done. He founded Duleko to bridge that gap and help turn local skills into accessible opportunities.",
      "Sunil leads Duleko's product vision, strategy and partnerships. He studies Mathematics and Economics at Haverford College with cross courses at the University of Pennsylvania (Wharton), and is spending his junior year studying Mathematics and Economics at the University of Oxford.",
    ],
  },
  {
    id: "sanjay",
    slug: "sanjay-gupta",
    name: "Sanjay Gupta",
    jobTitle: "Tech Lead",
    image: "sanjay",
    imageSize: [1080, 1440],
    profilePath: "/worker/b7bc1f68-7f04-4eb4-addd-df5d71db8e98",
    url: "https://guptasanjay.com.np",
    sameAs: ["https://guptasanjay.com.np"],
    homeLocation: "Nepal",
    affiliation: ["Chitkara University"],
    alumniOf: [],
    knowsAbout: [
      "Full Stack Development",
      "Android Development",
      "System Architecture",
      "Software Engineering",
      "React",
      "TypeScript",
      "Supabase",
    ],
    quote: "If someone who isn't technical can't use and understand Duleko, it doesn't matter how well I build.",
    bio: [
      "Sanjay Gupta designed and built the Duleko platform. As Tech Lead he owns it end to end - the web app, the native Android app, the database and everything that keeps requests, chats and profiles clear and reliable for people who should never need to think about the tech underneath.",
      "He is a Software Engineer graduating in 2027 from Chitkara University, and built Duleko's stack from the ground up: a bilingual (English/Nepali) app backed by Supabase, with real-time chat, distance-based search and a native Android release. He leads all technical decisions, architecture, infrastructure and app releases. His portfolio is at guptasanjay.com.np.",
    ],
  },
  {
    id: "dipendra",
    slug: "dipendra-chaudhary",
    name: "Dipendra Chaudhary",
    jobTitle: "Community Lead",
    image: "dipendra",
    imageSize: [720, 900],
    profilePath: "/worker/541bf85d-3b39-465f-b14d-f0267ab09b10",
    sameAs: [],
    homeLocation: "Nepal",
    affiliation: ["Lumbini Provincial Hospital"],
    alumniOf: ["Universal College of Medical Sciences, Tribhuvan University"],
    knowsAbout: ["Community Outreach", "User Support", "Communications", "Public Health", "Pharmacy"],
    quote: "How do we make sure that every individual's unique skills are recognized and turned into real, local opportunities?",
    bio: [
      "Dipendra leads Duleko's community outreach, user support, product coordination and social media communications. He runs educational initiatives to help people use the platform, manages direct communication channels and gathers user feedback that guides technical improvements.",
      "He earned his Bachelor of Pharmacy (2021) as a Ministry of Education merit scholar from Universal College of Medical Sciences, Tribhuvan University, and has served as a Hospital Pharmacist at Lumbini Provincial Hospital since 2022.",
    ],
  },
];

export const skills = {
  "Trades & local services": [
    "Electrician", "Plumber", "Carpenter", "Mason", "Painter", "Mechanic", "Welder", "Farm worker",
    "Labourer", "Driver", "Auto rickshaw", "Delivery", "Cleaner", "Tailor", "Cook", "Mobile repair",
  ],
  "Professional & skilled services": [
    "IT / Computer", "Tutor", "Health / Medical", "Accountant", "Engineer", "Legal services",
    "Designer", "Photographer", "Technician", "Consultant",
  ],
  "Personal services": ["Fitness trainer", "Barber / Salon", "Makeup artist", "Music / Dance", "Child / Elder care"],
};

export const features = [
  "Find skilled people nearby - browse by skill or search, sorted by distance.",
  "Request work in a tap - describe the job, pick a free date and send a request.",
  "Negotiate a price with offers and counter-offers before you agree.",
  "Real-time chat, and add people you know as friends to stay connected.",
  "Set your skills, an optional rate and your availability on a full-year calendar.",
  "Reviews and reputation built from completed work.",
  "Phone verification, report and block, and privacy controls over your contact details.",
  "Fully bilingual: English and Nepali (नेपाली).",
  "Works on the web and as an Android app.",
];

const glossary = {
  howItWorks: [
    "Create your profile",
    "Showcase your skills",
    "Get discovered",
    "Connect",
    "Work & earn",
    "Build your reputation",
  ],
};

/**
 * Page body for crawlers. Each block is one of:
 *   { p: "text" } | { h2: "text" } | { ul: ["item", ...] } | { quote: "text" }
 *   { team: true } | { founder: id } | { skills: true } | { features: true }
 */
export const content = {
  "/": {
    h1: "Your skills deserve an opportunity.",
    blocks: [
      { p: "Duleko connects people who have skills with people who need them - making it easier to turn skills into work, income, and opportunity in Nepal." },
      { h2: "Skills are everywhere. Opportunities aren't." },
      { p: "People learn valuable skills through education, training, experience, and everyday life. But having a skill does not automatically create an income." },
      { p: "Starting a traditional business can require rent, a good location, equipment, bills, and marketing. For many skilled people, these costs become a barrier before they even find their first customer. The skill exists. The opportunity exists. The connection is missing." },
      { h2: "What if your skill itself could become your business?" },
      { p: "Duleko gives skilled people a virtual space to showcase what they can do and connect with people who need their services - without requiring a traditional shop or office. You bring the skill. Duleko helps people find it." },
      { h2: "How Duleko works: from skill to opportunity" },
      { ul: glossary.howItWorks },
      { h2: "What you can do on Duleko" },
      { features: true },
      { h2: "Skills you can find on Duleko" },
      { skills: true },
      { h2: "Duleko is for everyone" },
      { ul: [
        "Skilled people - showcase your skills and become discoverable.",
        "People looking for work - find opportunities based on what you can do.",
        "Students - turn your skills and available time into opportunities.",
        "Professionals - offer your services without depending entirely on a physical business.",
        "Businesses & households - find people with the skills you need.",
      ] },
      { h2: "Who built Duleko" },
      { team: true },
    ],
  },
  "/search": {
    h1: "Find skilled people near you",
    blocks: [
      { p: "Search Duleko for skilled people across Nepal. Filter by skill, district and the day you need them, see who is available, and sort by distance, rating or newest. Open a profile to see skills, rates, reviews and availability, then send a work request or start a chat." },
      { h2: "Browse by skill" },
      { skills: true },
    ],
  },
  "/about": {
    h1: "Why Duleko?",
    blocks: [
      { p: "People with valuable skills and people who need those skills often live in the same communities, yet finding one another can still be difficult." },
      { p: "We built Duleko to bridge that gap. Our goal is to make skills more visible, opportunities more accessible, and local connections more useful." },
      { h2: "The people behind Duleko" },
      { p: "Duleko was founded by Sunil K. Chaudhary. The platform - the web app, the Android app and everything behind them - was designed and built by Sanjay Gupta." },
      { team: true },
      { h2: "What Duleko does" },
      { features: true },
    ],
  },
  "/about/sanjay-gupta": { h1: "Sanjay Gupta", blocks: [{ founder: "sanjay" }] },
  "/about/sunil-k-chaudhary": { h1: "Sunil K. Chaudhary", blocks: [{ founder: "sunil" }] },
  "/about/dipendra-chaudhary": { h1: "Dipendra Chaudhary", blocks: [{ founder: "dipendra" }] },
  "/mission": {
    h1: "A skill should not need a shop to become a business.",
    blocks: [
      { p: "For many people, the biggest barrier to turning a skill into income is not the lack of ability. It is the cost and difficulty of becoming visible to customers." },
      { p: "A physical business may require a shop, rent, equipment, a prime location, and ongoing expenses. Duleko is built around a different possibility: what if your skill itself could be the beginning of your business?" },
      { p: "Duleko provides a virtual space where people can showcase their skills, become discoverable, and connect with people who need their services." },
      { h2: "Making skills economically discoverable" },
      { p: "Skills exist everywhere - among students, professionals, trained workers, farmers, tradespeople, business owners, and people who learned through years of experience. Our mission is to make those skills easier to discover and connect them with real opportunities." },
      { h2: "Training should lead somewhere" },
      { p: "Every year, people develop skills through government programs, educational institutions, private training, apprenticeships, and personal experience. But training alone does not guarantee work. A certificate can show that someone completed training. Duleko aims to help connect that skill with the people who may need it." },
      { quote: "We don't want skills to end with certificates. We want them to reach the people who need them." },
      { h2: "Our vision" },
      { p: "A Nepal where skills don't remain hidden, training doesn't end with certificates, and starting a service-based business doesn't always require a physical shop or large investment." },
    ],
  },
  "/individuals": {
    h1: "Turn your skills into opportunities",
    blocks: [
      { p: "Whether you are a student, professional, trained worker, farmer, tradesperson, or someone with skills learned through experience, Duleko gives you a place to showcase what you can do." },
      { ul: [
        "Create your free profile",
        "Showcase your skills and an optional rate",
        "Set your availability",
        "Be discovered by people nearby",
        "Connect with people who need your services",
        "Build your reputation through reviews",
      ] },
      { h2: "Skills you can offer" },
      { skills: true },
    ],
  },
  "/businesses": {
    h1: "Find the skills your business needs",
    blocks: [
      { p: "Businesses don't always need permanent employees. Sometimes they need someone with a specific skill for a specific job." },
      { p: "Duleko helps businesses discover skilled people and connect with them directly - search by skill and district, check availability and reviews, and send a work request." },
      { h2: "Skills available on Duleko" },
      { skills: true },
    ],
  },
  "/partners": {
    h1: "From skill training to skill utilization",
    blocks: [
      { p: "Duleko provides a digital platform where people who receive skill training can showcase what they have learned and become discoverable for relevant opportunities." },
      { p: "Training should not end when a certificate is issued. The next question should be: where can this person use the skill?" },
      { p: "Municipalities and training providers can partner with Duleko so their trainees create profiles, become visible to people nearby, and turn training into work. Contact us at dulekonepal@gmail.com." },
    ],
  },
  "/safety": {
    h1: "Built for connection. Designed with safety in mind.",
    blocks: [
      { p: "Duleko is designed with tools and policies that help make interactions safer, more transparent, and more accountable." },
      { ul: [
        "Phone verification - helps establish authentic user accounts.",
        "Work requests - create context before people connect for work.",
        "Reviews & reputation - build trust through completed work and feedback.",
        "Report & block - tools to respond to inappropriate behavior.",
        "Privacy controls - protect personal information and control how people connect with you.",
      ] },
    ],
  },
  "/motivation": {
    h1: "Why we built Duleko",
    blocks: [
      { p: "In our own words." },
      { p: "Duleko started from a plain observation: skilled people and the people who need them are usually close by, but there is no easy way for them to find each other beyond asking around. In Nepal's local communities, that gap costs both sides time, whether it is a worker who could use the job or an employer who could use the help." },
      { team: true },
    ],
  },
  "/privacy": {
    h1: "Privacy Policy",
    blocks: [
      { p: "How Duleko collects, uses and protects your information." },
      { ul: [
        "Never sold - Duleko does not sell your personal information.",
        "Your number stays private - you choose who can see your contact details.",
        "Location on your terms - location is used for distance-based search and you control it.",
      ] },
    ],
  },
  "/terms": {
    h1: "Terms of Use & User Policy",
    blocks: [
      { p: "Please read these terms before using Duleko. They explain what Duleko is, and what is expected of everyone who uses it." },
      { ul: [
        "Duleko connects, it does not employ - Duleko is a platform that connects people; it is not the employer.",
        "Payments are between users - rates and payment are agreed directly between the people involved.",
        "Honesty is required - profiles, skills and reviews must be truthful.",
        "You must be 18 or older, and sign up with a Google or email account of your own.",
      ] },
      { p: "Questions about these terms, or something to report? Reach us at dulekonepal@gmail.com." },
    ],
  },
  "/registration-policy": {
    h1: "Duleko User Registration Policy",
    blocks: [
      { p: "Duleko helps people discover skills, connect with people nearby, and find or offer work opportunities. By creating an account, you agree to the following:" },
      { ul: [
        "Be 18 or older - you must be at least 18 to create an account, using a Google or email account of your own.",
        "Provide genuine information about yourself, your skills, experience, location, rates and qualifications.",
        "Phone verification is required - every registered account must have a verified phone number.",
        "Use Duleko responsibly - no scams, harassment, discrimination, illegal activities or exploitation.",
        "Be truthful about your skills - only list skills you can reasonably perform.",
        "Respect other users in work requests, communication, cancellations, payments and reviews.",
        "Protect personal information such as your phone number and exact location.",
        "Work and payment are between users - Duleko helps people connect and does not guarantee the work.",
        "Safety comes first - use reasonable judgment and report unsafe behavior.",
        "Duleko may restrict or suspend accounts involved in fraud, fake credentials or serious policy violations.",
      ] },
    ],
  },
};

export const breadcrumbNames = {
  "/search": "Find skilled people",
  "/about": "About Duleko",
  "/about/sanjay-gupta": "Sanjay Gupta",
  "/about/sunil-k-chaudhary": "Sunil K. Chaudhary",
  "/about/dipendra-chaudhary": "Dipendra Chaudhary",
  "/mission": "Our Mission",
  "/individuals": "For Individuals",
  "/businesses": "For Businesses",
  "/partners": "Municipalities & Training Providers",
  "/safety": "Trust & Safety",
  "/motivation": "Our Motivation",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Use",
  "/registration-policy": "Registration Policy",
};
