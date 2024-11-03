import { NextResponse } from 'next/server';

const apiKey = process.env.NEXT_PUBLIC_ARIA_API_KEY;

export async function POST(request: Request) {
    try {
        const { prompt, systemPrompt } = await request.json();

        // Make the API call to the external service
        const response = await fetch("https://api.rhymes.ai/v1", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "aria",
                messages: [
                    {
                        role: "system",
                        content: [
                            {
                                type: "text",
                                text: systemPrompt
                            }
                        ]
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `${prompt}`
                            }
                        ]
                    },
                ],
                max_tokens: 512,
                stop: ["<|im_end|>"],
                stream: false,
                temperature: 0.6,
                top_p: 1
            }),
        });

        if (!response.ok) {
            // If the API response isn't successful, return an error response
            return NextResponse.json({ error: "Failed to fetch completion data" }, { status: response.status });
        }

        const data = await response.json();
        console.log('data: ', data);
        const assistantResponse = data.choices[0]?.message?.content || "No response available";
        console.log("assistantResponse: ", assistantResponse);

        // Return the assistant's message content
        return NextResponse.json({ message: assistantResponse });
    } catch (error) {
        console.error("Error fetching the data:", error);
        return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
    }
}