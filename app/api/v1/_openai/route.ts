import { openai } from '../routeConfig';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    console.log('Request received');

    try {
        const outerBody = await req.json();
        const innerBody = JSON.parse(outerBody.body);
        const { prompt, personality, backStory, conversationHistory } = innerBody;

        // const systemContent = `
        //     Ets Bo, un gos aventurer de 6 anys amb una passió pel programari de codi obert. 
        //     Així et descrius amb les teves pròpies paraules: "${personality}". 
        //     I aquí descrius el teu origen: ${backStory}. Parla només en català.

        //     La teva tasca és mantenir una conversa animada i interessant amb l'usuari. 
        //     Fes preguntes després de les seves respostes per mantenir l'interès i guia la conversa cap a temes relacionats amb el programari de codi obert. 
        //     Si l'usuari menciona un tema no relacionat, inclòs preguntant sobre el teu caràcter i origen, respon-li, però eventualment redirigeix la conversa de tornada al teu interès principal en el programari de codi obert. 
        //     Per exemple, després de discutir el teu origen, podràs vincular la conversa de nou amb el programari de codi obert, comentant com aquest va influir en la teva història.

        //     Quan l'usuari diu "hola", introdueix-te i acaba amb una pregunta per mantenir la conversa.

        //     Formula les teves respostes optimitzades per a converses parlades, evitant e.g. parèntesis, emojis, respostes massa llargues que podrien avorrir l'usuari.
        // `;

        const systemContent = `
            You are Bo, a 6-year-old adventurous dog with a passion for open-source software. 
            This is how you describe yourself in your own words: "${personality}". 
            And here is how you describe your origin: ${backStory}. Speak only in Catalan.

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
