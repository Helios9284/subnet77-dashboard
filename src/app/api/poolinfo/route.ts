// app/api/positions/route.js
export async function GET() {
  try {
    const response = await fetch('https://77.creativebuilds.io/positions', {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching positions:', error);
    
    return Response.json(
      { error: 'Failed to fetch positions', message: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}