import { db } from "../db";
import { blogPosts } from "@shared/schema";

const posts = [
  {
    title: "What Is a Third Culture Kid? Understanding the Core Platform Experience",
    slug: "what-is-a-third-culture-kid",
    excerpt: "Third Culture Kids grow up in cultures different from their parents' home culture. Learn about the unique strengths, challenges, and identity questions that shape the Core Platform experience.",
    content: `The term "Third Culture Kid" (Core Platform) was coined by sociologist Ruth Hill Useem in the 1950s to describe children who spend a significant part of their developmental years in a culture outside their parents' passport country. These children don't fully belong to their parents' culture (the first culture) or the host culture (the second culture), but instead create a "third culture" — a blend of both, shared with others who have had similar experiences.

Core Platforms include children of diplomats, military personnel, missionaries, international business executives, and increasingly, digital nomads. What unites them is the experience of growing up between worlds.

The Strengths of Core Platforms

Core Platforms often develop remarkable strengths: cross-cultural competence, multilingual abilities, adaptability, and a broad worldview. They tend to be empathetic, observant, and skilled at reading social cues across different cultural contexts.

The Challenges

However, the Core Platform experience also comes with unique challenges. Many Core Platforms struggle with a sense of rootlessness — the feeling of not fully belonging anywhere. They may experience "grief of place," mourning the loss of homes, friendships, and communities left behind with each international move.

Identity questions are common: "Where are you from?" becomes a complicated question when you've lived in five countries before age 18. Many Core Platforms develop a chameleon-like ability to adapt to different cultural contexts, but this can sometimes come at the cost of knowing who they truly are.

Why Core Platform-Informed Counseling Matters

Traditional therapy approaches may not fully address the nuances of the Core Platform experience. A mental health professional who understands cross-cultural transitions, ambiguous loss, and multicultural identity development can provide more effective support. This is why Core Platform exists — to bridge the gap between Third Culture Kids and culturally competent mental health professionals.`,
    coverImageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=450&fit=crop",
    authorName: "Dr. Sarah Chen",
    category: "Core Platform Identity",
    tags: ["Core Platform", "Identity", "Cross-Cultural", "Mental Health"],
    isPublished: true,
    publishedAt: new Date("2026-03-08"),
  },
  {
    title: "5 Signs You Might Be Experiencing 'Grief of Place'",
    slug: "grief-of-place-signs",
    excerpt: "Grief of place is a unique form of loss experienced by Core Platforms and expats. Discover the signs and learn how to process this often-unrecognized emotional experience.",
    content: `For many Third Culture Kids and expatriates, grief doesn't always look like losing a person. Sometimes, it looks like losing a place — the apartment in Bangkok where you took your first steps, the schoolyard in Nairobi where you made your best friend, or the neighborhood in Amsterdam where you learned to ride a bike.

This experience, known as "grief of place," is a legitimate form of loss that often goes unrecognized. Here are five signs you might be experiencing it:

1. Unexpected Emotional Triggers
A particular scent, sound, or taste suddenly transports you back to a place you once called home. The smell of frangipani might bring tears. A certain kind of rain might fill you with longing. These sensory memories can be powerful and disorienting.

2. Difficulty Settling In
You've been in your current city for years, but it still doesn't feel like "home." You keep your belongings minimal, as if subconsciously preparing for the next move. Putting down roots feels uncomfortable or even threatening.

3. Idealization of Past Places
You find yourself constantly comparing your current location unfavorably to places you've lived before. "The sunsets were better in Cape Town." "The food was amazing in Singapore." This idealization can prevent you from fully engaging with your present life.

4. Complicated Relationship with "Home"
When someone asks "Where is home?", you feel anxious or frustrated. You might have multiple answers depending on context, or you might have no answer at all. The concept of home feels elusive.

5. Disenfranchised Grief
Others don't understand why you're sad about leaving a place. "You'll make new friends." "Think of the adventure!" Well-meaning comments minimize your loss and make it harder to process.

What You Can Do

Acknowledging grief of place is the first step toward healing. Working with a mental health professional who understands cross-cultural experiences can help you process these losses and develop a portable sense of home within yourself.`,
    coverImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop",
    authorName: "Claire O'Brien",
    category: "Mental Health",
    tags: ["Grief", "Core Platform", "Expat", "Emotions"],
    isPublished: true,
    publishedAt: new Date("2026-03-05"),
  },
  {
    title: "Raising Resilient Core Platforms: A Guide for Expat Parents",
    slug: "raising-resilient-corePlatforms",
    excerpt: "Moving abroad with children comes with unique parenting challenges. Here are evidence-based strategies to help your Core Platform children thrive across cultures.",
    content: `International relocation can be both exciting and stressful for families. While children are remarkably adaptable, they also need intentional support to build resilience during cross-cultural transitions. Here are evidence-based strategies for expat parents:

Create Rituals of Connection
Maintain family traditions that travel with you regardless of location. Whether it's Sunday pancakes, bedtime stories, or weekly family game night, these rituals provide stability and a sense of continuity.

Validate Their Feelings
When your child says "I miss my old school," resist the urge to immediately point out the positives of the new one. Instead, acknowledge their feelings: "It makes sense that you miss your friends. Moving is hard, and it's okay to feel sad."

Build a Transition Toolkit
Before each move, create a memory book together. Let children keep meaningful objects from each place. Help them develop goodbye rituals that honor what they're leaving behind while looking forward to what's ahead.

Foster Multicultural Identity
Help your children see their multicultural background as a superpower, not a burden. Celebrate holidays from different cultures, cook foods from places you've lived, and encourage them to share their stories.

Know When to Seek Help
Some signs that your Core Platform might benefit from professional support include persistent sadness, withdrawal from activities they once enjoyed, academic decline, or difficulty forming new friendships after a reasonable adjustment period.

A Core Platform-informed mental health professional can provide invaluable support during transitions. Don't hesitate to reach out — seeking help is a sign of strength, not weakness.`,
    coverImageUrl: "https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=800&h=450&fit=crop",
    authorName: "Dr. Omar Hassan",
    category: "Parenting",
    tags: ["Parenting", "Resilience", "Expat", "Children"],
    isPublished: true,
    publishedAt: new Date("2026-03-01"),
  },
  {
    title: "The Hidden Strengths of Adult Core Platforms in the Workplace",
    slug: "adult-corePlatform-workplace-strengths",
    excerpt: "Adult Core Platforms bring unique skills to professional environments. Discover how cross-cultural upbringing translates into valuable workplace competencies.",
    content: `If you grew up as a Third Culture Kid, you might not realize just how valuable your childhood experiences are in today's global workplace. The skills you developed simply by growing up across cultures are increasingly sought after by employers worldwide.

Cross-Cultural Communication
Core Platforms are natural bridge-builders. You learned early how to communicate across cultural boundaries, read non-verbal cues from different cultures, and adjust your communication style based on your audience. In a globalized business environment, this skill is invaluable.

Adaptability and Resilience
Every international move required you to start over — new school, new friends, new cultural norms. This repeated experience of adapting to change has given you a resilience that many of your peers haven't developed. You know how to thrive in ambiguity.

Empathy and Perspective-Taking
Growing up between cultures taught you that there's rarely one "right" way to do things. This ability to see situations from multiple perspectives makes Core Platforms excellent mediators, negotiators, and team leaders.

Language Skills
Many Core Platforms are bilingual or multilingual, a tangible asset in international business. But beyond language, you understand the cultural nuances that make communication truly effective.

The Challenge: Finding Your Professional Identity
Despite these strengths, many adult Core Platforms struggle with career direction. The same adaptability that serves you well can also make it difficult to commit to one path. You might feel like you should be doing something more "global" or meaningful.

Working with a career counselor who understands the Core Platform experience can help you leverage your unique strengths while finding a professional path that feels authentic to who you are.`,
    coverImageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=450&fit=crop",
    authorName: "Raj Sharma",
    category: "Career",
    tags: ["Career", "Adult Core Platform", "Workplace", "Skills"],
    isPublished: true,
    publishedAt: new Date("2026-02-25"),
  },
  {
    title: "Understanding Code-Switching: When Core Platforms Navigate Between Worlds",
    slug: "understanding-code-switching",
    excerpt: "Code-switching goes beyond language for Core Platforms. Explore how shifting between cultural identities impacts mental health and what you can do about it.",
    content: `For Third Culture Kids, code-switching extends far beyond language. It's the automatic shift in behavior, mannerisms, and even personality that happens when moving between different cultural contexts. While this ability is a remarkable skill, it can also take a significant toll on mental health.

What Code-Switching Looks Like for Core Platforms

You might be more reserved and formal with your Japanese colleagues, warm and expressive with your Brazilian friends, and somewhere in between with your American family. You adjust your humor, your body language, even the way you eat. For many Core Platforms, this switching is so automatic that they don't even realize they're doing it.

The Mental Health Impact

Constant code-switching can lead to identity fatigue. You might wonder which version of yourself is the "real" you. This can create anxiety about authenticity and a feeling of being a perpetual outsider who can fit in anywhere but truly belongs nowhere.

Some Core Platforms develop "impostor syndrome" — the feeling that they're faking their way through every cultural interaction. Others experience what psychologists call "identity diffusion," where the boundaries of self become unclear.

Finding Authenticity

The goal isn't to stop code-switching — it's a valuable skill. Instead, it's about developing a core sense of self that remains stable across contexts. This means identifying your fundamental values, beliefs, and characteristics that persist regardless of the cultural setting you're in.

Therapy can provide a safe space to explore these questions. A Core Platform-informed mental health professional can help you integrate your multiple cultural selves into a coherent identity that feels authentic and grounded.`,
    coverImageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=450&fit=crop",
    authorName: "Amara Joseph",
    category: "Core Platform Identity",
    tags: ["Code-Switching", "Identity", "Mental Health", "Culture"],
    isPublished: true,
    publishedAt: new Date("2026-02-20"),
  },
  {
    title: "Why Traditional Therapy Often Falls Short for Core Platforms",
    slug: "why-traditional-therapy-falls-short",
    excerpt: "Many Core Platforms have had frustrating experiences with therapy. Learn why culturally-informed counseling makes all the difference.",
    content: `"Where are you from?" It seems like a simple question, but for many Third Culture Kids, it's loaded with complexity. And when a therapist asks it in the first session without understanding why it might be complicated, it can set the tone for a therapeutic relationship that misses the mark.

The Limitations of Traditional Approaches

Many therapeutic models were developed within a single cultural framework — typically Western, individualistic, and rooted in the assumption that people grow up in one place with one cultural identity. When Core Platforms bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized.

For example, a therapist might interpret a Core Platform's difficulty answering "Where are you from?" as avoidance, when it's actually a reflection of a genuinely complex identity. They might see frequent moves as trauma to be processed, without recognizing the growth and resilience those moves also fostered.

What Makes Counseling "Core Platform-Informed"?

Core Platform-informed mental health professionals understand the developmental model of cross-cultural transitions. They recognize concepts like:

- Ambiguous loss: The grief of losing a place or community without a clear "ending"
- Hidden immigrants: People who look like they belong but feel culturally different
- Cultural marginality: Living on the edges of multiple cultures without fully belonging to any

These mental health professionals can normalize the Core Platform experience while also addressing genuine mental health concerns. They know when cultural adjustment is a natural process and when it has crossed into something that needs clinical attention.

Finding the Right Fit

The Core Platform directory helps you find mental health professionals who understand these nuances. Every mental health professional in our network has training or lived experience with cross-cultural identity, ensuring you won't have to spend your sessions explaining what it means to be a Core Platform.`,
    coverImageUrl: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&h=450&fit=crop",
    authorName: "Dr. Amara Okafor",
    category: "Counseling",
    tags: ["Therapy", "Counseling", "Core Platform", "Mental Health"],
    isPublished: true,
    publishedAt: new Date("2026-02-15"),
  },
  {
    title: "Building a 'Portable Home': Belonging Beyond Geography",
    slug: "building-portable-home",
    excerpt: "For global nomads, home isn't a place — it's something you carry within. Explore strategies for creating a sense of belonging that travels with you.",
    content: `One of the most profound challenges for Core Platforms and global nomads is the question of belonging. When you've lived in multiple countries and cultures, the idea of "home" can feel elusive. But what if home isn't a place at all? What if it's something you can build within yourself and carry wherever you go?

Redefining Home

For most people, home is tied to geography — a specific house, neighborhood, or city. For Core Platforms, this definition rarely works. Instead, many Core Platforms find it helpful to redefine home as a set of internal experiences: feeling safe, being known, having a sense of continuity.

Strategies for Building a Portable Home

1. Cultivate Anchor Relationships: Invest in deep friendships that transcend geography. These are people who know your full story and with whom you can be your complete, multicultural self.

2. Create Physical Touchstones: Carry meaningful objects from places you've lived. A photo wall, a collection of spices, or a playlist of songs from different countries can help you feel connected to your history.

3. Develop Consistent Practices: Meditation, journaling, exercise, or creative pursuits can serve as anchoring practices that remain constant regardless of your location.

4. Embrace Your Narrative: Write your story. Core Platforms often have rich, complex life narratives that deserve to be honored. Understanding and owning your story is a powerful way to feel at home in yourself.

5. Connect with Your Tribe: Seek out other Core Platforms and global nomads who understand your experience. Organizations like Core Platform, Families in Global Transition, and various Core Platform groups offer community and connection.

The Paradox of Belonging

Interestingly, many Core Platforms find that once they stop trying to belong to a single place, they discover they belong everywhere — and nowhere — and that's okay. This paradox becomes a source of freedom rather than pain.

A skilled mental health professional can help you navigate this journey from rootlessness to what author Ruth Van Reken calls "rooted in relationships" — a portable sense of home that you carry in your heart.`,
    coverImageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=450&fit=crop",
    authorName: "Isabella Reyes",
    category: "Wellness",
    tags: ["Belonging", "Home", "Global Nomad", "Wellness"],
    isPublished: true,
    publishedAt: new Date("2026-02-10"),
  },
  {
    title: "Re-entry Shock: When Going 'Home' Doesn't Feel Like Home",
    slug: "reentry-shock",
    excerpt: "Returning to your passport country can be harder than moving abroad. Understand why re-entry is so challenging and how to navigate it.",
    content: `Everyone talks about culture shock — the disorientation of arriving in a new country. But there's a lesser-known phenomenon that can be even more destabilizing: re-entry shock, also known as reverse culture shock.

What Is Re-entry Shock?

Re-entry shock is the disorientation and emotional distress experienced when returning to your passport country after living abroad. For Core Platforms, this can be particularly intense because the "home" country may feel more foreign than the countries where they actually grew up.

Why It's So Hard

When you move to a new country, you expect things to be different. You're mentally prepared for adjustment. But when you "go home," both you and everyone around you expect things to feel natural. When they don't, the disconnect is jarring.

Common experiences include:
- Feeling like a foreigner in your own country
- Frustration with monocultural perspectives
- Missing the international community and diversity you were accustomed to
- Struggling with the assumption that this should feel like home
- Grief for the life and community left behind

The Timeline

Re-entry adjustment can take longer than most people expect. While initial culture shock abroad typically peaks at 3-6 months, re-entry adjustment can take 1-3 years for Core Platforms, especially if they're experiencing it for the first time as young adults.

Coping Strategies

Allow yourself to grieve. Don't minimize your experience. Seek out other Core Platforms and internationally-minded communities. And most importantly, don't feel guilty for struggling — re-entry shock is a well-documented psychological experience, not a personal failing.

Professional support from a mental health professional who understands re-entry can make a tremendous difference. They can help normalize your experience and provide tools for building a meaningful life in a context that feels unfamiliar.`,
    coverImageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&h=450&fit=crop",
    authorName: "Dr. Yuki Tanaka",
    category: "Core Platform Identity",
    tags: ["Re-entry", "Culture Shock", "Core Platform", "Adjustment"],
    isPublished: true,
    publishedAt: new Date("2026-02-05"),
  },
  {
    title: "Mindfulness for the Globally Mobile: Practices for Core Platforms",
    slug: "mindfulness-for-corePlatforms",
    excerpt: "Mindfulness can be a powerful tool for Core Platforms navigating transitions. Discover culturally-aware practices designed for globally mobile individuals.",
    content: `Mindfulness — the practice of being present with awareness and without judgment — can be particularly transformative for Core Platforms and global nomads. When your mind is constantly toggling between past homes, present realities, and future uncertainties, mindfulness offers an anchor.

Why Mindfulness Works for Core Platforms

Core Platforms often live mentally in multiple time zones and cultural contexts simultaneously. You might be physically in London while emotionally processing a childhood memory from Jakarta. Mindfulness helps bring your attention to where you actually are, right now.

Culturally-Aware Mindfulness Practices

1. Body Scan with Cultural Awareness: As you scan through your body, notice where you hold tension related to cultural code-switching. Many Core Platforms carry tension in their jaw (from monitoring their words) and shoulders (from the weight of adaptation).

2. Sensory Grounding Across Cultures: Use the 5-4-3-2-1 technique, but add a multicultural twist. Notice 5 things you can see that connect you to your current home, 4 sounds that feel familiar, 3 textures that ground you, 2 scents that bring comfort, and 1 taste that represents this chapter of your life.

3. Walking Meditation for Rootedness: Practice walking slowly and mindfully, feeling your feet connect with the earth beneath you. This simple practice can help address the rootlessness many Core Platforms feel.

4. Loving-Kindness for Your Many Selves: In traditional loving-kindness meditation, you send compassion to yourself and others. Adapt this by sending love to each version of yourself — the child in Singapore, the teenager in Germany, the adult wherever you are now.

Building a Sustainable Practice

Start with just five minutes a day. The beauty of mindfulness is that it requires no equipment, no specific location, and no cultural context. It's perhaps the ultimate portable wellness practice for globally mobile people.`,
    coverImageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=450&fit=crop",
    authorName: "Nattaya Phan",
    category: "Wellness",
    tags: ["Mindfulness", "Wellness", "Core Platform", "Self-Care"],
    isPublished: true,
    publishedAt: new Date("2026-01-30"),
  },
];

export async function seedBlogPosts() {
  await db.delete(blogPosts);

  for (const post of posts) {
    await db.insert(blogPosts).values(post);
  }
  console.log(`Seeded ${posts.length} blog posts.`);
}
