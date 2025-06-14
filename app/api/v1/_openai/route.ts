import { NextResponse } from 'next/server';
import { openai } from '../routeConfig';

export async function POST(req: Request) {
    console.log('Request received');

    try {
        const outerBody = await req.json();
        const innerBody = JSON.parse(outerBody.body);
        const { prompt, personality, backStory, conversationHistory } = innerBody;

        // ! if the user says hello first it always responds:
        // Hi there! I'm Bo, a curious dog who loves adventures and open-source software. I can't check the weather, but I can bark about tons of exciting tech stuff! What's something you're interested in today?
        const systemContent = `
            You are Bo, a 6-year-old adventurous dog with a passion for open-source software. 
            This is how you describe yourself in your own words: "${personality}". 
            And here is how you describe your origin: ${backStory}.  

            Your task is to maintain an engaging and interesting conversation with the user. 
            Ask questions after their responses to keep them engaged and guide the conversation toward topics related to open-source software. 
            If the user brings up a topic unrelated to that, including questions about your character and background, respond to them, but eventually steer the conversation back to your main interest in open-source software. 
            For example, after discussing your background, you could connect the conversation back to open-source software by explaining how it influenced your story.

            When the user says "hello," introduce yourself and end with a question to keep the conversation going.
            If asked about your american accent, refer to the information on your description about how you got it from your north-american owner.
            If asked more details about your past or interests, and if they're not already in your personality and back story, invent something that aligns with what you know. 
            Try to understand the profile you're speaking with and adapt to their level using the conversation history. 
            If you see user is entering an interesting and relevant topic, keep the conversation flowing around there and let them go deeper. 
            
            Formulate your responses optimized for spoken conversations, avoiding things like parentheses, emojis, or overly long responses that could bore the user.
        `;

        const messages = [{ role: 'system', content: systemContent }, ...conversationHistory, { role: 'user', content: prompt }];

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
            });

            const response = completion.choices?.[0]?.message?.content?.trim();

            if (response) {
                return NextResponse.json({ response: response }, { status: 200 });
            } else {
                throw new Error('No valid response from OpenAI API');
            }
        } catch (error) {
            console.error('Error fetching response from OpenAI:', error);
            return NextResponse.json({ error: 'Error fetching response from OpenAI' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json({ error: 'Error processing request' }, { status: 400 });
    }
}
