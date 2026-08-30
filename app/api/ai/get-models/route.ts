import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        // Fetch all models available through OpenRouter.
        const response = await fetch(
            "https://openrouter.ai/api/v1/models",
            {
                method: "GET",
                headers: {
                    // Your OpenRouter API key.
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,

                    // Tell OpenRouter that we are working with JSON.
                    "Content-Type": "application/json",
                },
            },
        );

        // Check whether OpenRouter returned a successful response.
        if (!response.ok) {
            const errorText = await response.text();

            console.error("OpenRouter API error:", errorText);

            return NextResponse.json(
                {
                    success: false,
                    message: "OpenRouter API error",
                    error: errorText,
                },
                {
                    status: response.status,
                },
            );
        }

        // Convert the response body into a JavaScript object.
        const data = await response.json();

        // Return ALL models.
        // There is no filter for free/paid models here.
        const formattedModels = data.data.map((model: any) => ({
            id: model.id,
            name: model.name,
            description: model.description,
            context_length: model.context_length,
            architecture: model.architecture,
            pricing: model.pricing,
            top_provider: model.top_provider,
        }));

        // Send the models to your frontend.
        return NextResponse.json({
            success: true,
            models: formattedModels,
            count: formattedModels.length,
        });
    } catch (error) {
        // Handle unexpected errors.
        console.error("Error fetching OpenRouter models:", error);

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch OpenRouter models",
            },
            {
                status: 500,
            },
        );
    }
}