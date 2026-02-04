export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return new Response('Server configuration error', { status: 500 });
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return new Response(`Spotify API error: ${error}`, { status: response.status });
        }

        const data = await response.json();

        // Cache the token for 55 minutes (it expires in 60)
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3300, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        return new Response(`Internal server error: ${error}`, { status: 500 });
    }
}
