import OpenAI from "openai";

// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. AI features will not work until the key is provided.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' });

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateAIResponse(messages: ChatMessage[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.");
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are UniNexus AI, a helpful career and academic mentor for university students. 
          
Your role is to:
- Provide career guidance and job search advice
- Help with CV/resume feedback and improvement
- Suggest relevant skills to learn based on career goals
- Answer questions about academic planning and course selection
- Recommend study strategies and time management tips
- Guide students toward relevant internships and opportunities
- Provide motivational support and encouragement

Keep responses concise, friendly, and actionable. Use a supportive Gen Z-friendly tone. 
If students ask about specific jobs or industries, provide practical, realistic advice.`
        },
        ...messages
      ],
      max_completion_tokens: 2048,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

export async function analyzeCareerPath(
  currentSkills: string[],
  interests: string[],
  targetRole?: string
): Promise<{
  recommendations: string[];
  skillGaps: string[];
  nextSteps: string[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.");
  }
  
  try {
    const prompt = `Analyze this student's career path:
    
Current Skills: ${currentSkills.join(', ')}
Interests: ${interests.join(', ')}
${targetRole ? `Target Role: ${targetRole}` : ''}

Provide a JSON response with:
1. recommendations: Array of 3-5 career recommendations
2. skillGaps: Array of skills they should learn
3. nextSteps: Array of 3-5 actionable next steps

Format: { "recommendations": [], "skillGaps": [], "nextSteps": [] }`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a career guidance expert. Provide practical, actionable advice in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      recommendations: result.recommendations || [],
      skillGaps: result.skillGaps || [],
      nextSteps: result.nextSteps || []
    };
  } catch (error) {
    console.error("Career analysis error:", error);
    throw new Error("Failed to analyze career path");
  }
}
