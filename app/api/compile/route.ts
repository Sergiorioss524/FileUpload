import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { latexCode } = await request.json();

        if (!latexCode || typeof latexCode !== 'string') {
            console.error('Invalid LaTeX code');
            return new Response('Invalid LaTeX code', { status: 400 });
        }

        // Wrap the latexCode with a minimal LaTeX document
        const fullLatexDocument = `
\\documentclass{article}
\\usepackage{amsmath} % Include packages as needed
\\begin{document}
${latexCode}
\\end{document}
`;

        // URL-encode the full LaTeX document
        const encodedLatex = encodeURIComponent(fullLatexDocument);

        // Construct the API URL
        const apiUrl = `https://latexonline.cc/compile?text=${encodedLatex}`;

        // Fetch the compiled PDF from the third-party service
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from LaTeXOnline.cc: ${response.status} ${response.statusText} - ${errorText}`);
            return new Response(`Failed to generate PDF: ${errorText}`, { status: 500 });
        }

        const pdfBuffer = await response.arrayBuffer();

        // Return the PDF to the client using the standard Response object
        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=document.pdf',
            },
        });
    } catch (error) {
        console.error('Error in API route:', error);
        if (error instanceof Error) {
            return new Response(`An error occurred while generating the PDF: ${error.message}`, { status: 500 });
        } else {
            return new Response('An unexpected error occurred', { status: 500 });
        }
    }}