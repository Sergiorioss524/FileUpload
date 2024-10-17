"use client";

import React, { useState } from 'react';
import { MathJaxContext, MathJax as MathJaxComponent } from 'better-react-mathjax';
import { Tooltip } from 'react-tooltip';
import { FaComments } from 'react-icons/fa';

// Interface for comments
interface Comment {
    id: number;       // Unique identifier for each comment
    text: string;     // The comment text
    start: number;    // Start index of the selected text
    end: number;      // End index of the selected text
    color: string;    // Color of the highlight
}

const FileUpload: React.FC = () => {
    const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(null);
    const [editorContent, setEditorContent] = useState<string>('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState<string>('');
    const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
    const [showComments, setShowComments] = useState<boolean>(true);
    const [fileName, setFileName] = useState<string>(''); // New state for file name

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name); // Update the file name state
            const reader = new FileReader();
            reader.onload = () => {
                const content = reader.result?.toString() || '';
                setFileContent(content);
                setEditorContent(content); // Initialize the editor with file content
            };

            // Check the file extension
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (fileExtension === 'txt' || fileExtension === 'md' || fileExtension === 'latex') {
                reader.readAsText(file); // Handle text files
            } else {
                alert('Unsupported file format. Please upload a .txt, .md, or .latex file.');
            }
        }
    };

    const handleEditorChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditorContent(event.target.value);
    };

    // Handle text selection in the preview area
    const handlePreviewSelection = () => {
        const selectionObj = window.getSelection();
        if (selectionObj && selectionObj.toString().length > 0) {
            const selectedText = selectionObj.toString();
            const start = editorContent.indexOf(selectedText);
            const end = start + selectedText.length;
            if (start !== -1) {
                setSelection({ start, end });
                setShowCommentInput(true);
            }
        }
    };

    const addComment = () => {
        if (newComment && selection) {
            const newCommentData: Comment = {
                id: comments.length + 1,
                text: newComment,
                start: selection.start,
                end: selection.end,
                color: selectedColor,
            };
            setComments([...comments, newCommentData]);
            setNewComment('');
            setSelection(null);
            setShowCommentInput(false);
        }
    };

    // Updated downloadAsPDF function using JSON
    const downloadAsPDF = () => {
        // Prepare the JSON data
        const data = { latexCode: editorContent };

        // Send the LaTeX code to the API route for compilation
        fetch('/api/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to generate PDF');
                }
                return response.blob();
            })
            .then(blob => {
                // Create a URL for the blob and initiate download
                const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                // Use the file name for the PDF if available
                const pdfFileName = fileName ? fileName.replace(/\.[^/.]+$/, '') + '.pdf' : 'document.pdf';
                link.setAttribute('download', pdfFileName);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`An error occurred while generating the PDF:\n${error.message}`);
            });
    };

    const renderPreviewContent = () => {
        let content = editorContent;

        // Sort comments in reverse order to prevent indexing issues
        const sortedComments = [...comments].sort((a, b) => b.start - a.start);

        // Sanitize the content to prevent XSS attacks
        const escapeHtml = (unsafe: string) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        content = escapeHtml(content);

        sortedComments.forEach((comment) => {
            const before = content.slice(0, comment.start);
            const highlighted = content.slice(comment.start, comment.end);
            const after = content.slice(comment.end);

            // Wrap the highlighted text with a span
            content = `${before}<span class="commented-text" data-id="${comment.id}" style="background-color: ${
                comment.color
            }; border-radius: 4px; padding: 2px;" data-tooltip-id="comment-tooltip" data-tooltip-content="${escapeHtml(
                comment.text
            )}">${highlighted}</span>${after}`;
        });

        return (
            <div
                id="latex-preview-content"
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    };

    return (
        <div className="bg-gray-100 p-5 min-h-screen flex relative">
            {/* Comments Sidebar Toggle Button */}
            {fileContent && (
                <button
                    onClick={() => setShowComments(!showComments)}
                    className="fixed top-1/2 -right-4 transform -translate-y-1/2 bg-black text-white p-3 rounded-l-lg shadow-lg hover:bg-zinc-800 z-50"
                >
                    <FaComments size={24} />
                </button>
            )}

            <div className="flex-1 pr-4">
                <input
                    type="file"
                    onChange={handleFileUpload}
                    className="mb-4 p-2 border border-gray-300 rounded-lg"
                />

                {fileContent && (
                    <div>
                        {/* Display the file name */}
                        {fileName && (
                            <p className="text-black mb-2">
                                <strong>File:</strong> {fileName}
                            </p>
                        )}

                        <h3 className="text-gray-800 mb-2 text-lg font-semibold">Edit Content:</h3>
                        <textarea
                            id="editor-textarea"
                            value={editorContent}
                            onChange={handleEditorChange}
                            rows={10}
                            className="w-full bg-white text-black p-4 border border-gray-300 rounded-lg shadow-sm"
                        />

                        <h3 className="text-gray-800 mt-4 text-lg font-semibold">LaTeX Preview:</h3>
                        {/* Instruction text */}
                        <p className="text-gray-600 mb-2">
                            To add a comment, highlight the text in the preview area.
                        </p>
                        <div
                            id="latex-preview"
                            className="bg-white p-4 text-black border border-gray-300 rounded-lg shadow-sm"
                            onMouseUp={handlePreviewSelection} // Handle text selection in preview
                        >
                            <MathJaxContext>
                                <MathJaxComponent dynamic>
                                    <div>
                                        {renderPreviewContent()}
                                    </div>
                                </MathJaxComponent>
                            </MathJaxContext>
                            <Tooltip id="comment-tooltip" />
                        </div>

                        {/* Button to download PDF */}
                        <button
                            onClick={downloadAsPDF}
                            className="mt-4 bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800 shadow-md"
                        >
                            Download as PDF
                        </button>
                    </div>
                )}
            </div>

            {/* Sidebar for Comments - Only displayed after file upload */}
            {fileContent && showComments && (
                <div className="w-1/3 bg-white p-4 ml-4 rounded-lg shadow-lg">
                    <h3 className="text-gray-800 mb-4 text-xl font-bold flex items-center">
                        <FaComments className="mr-2" /> Comments
                    </h3>
                    {comments.length === 0 ? (
                        <p className="text-gray-600">No comments yet.</p>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="bg-gray-100 p-3 mb-3 border border-gray-200 rounded-lg">
                                <strong style={{ color: "black" }}>Comment {comment.id}:</strong>
                                {/* Change comment text color to black */}
                                <p className="text-black">{comment.text}</p>
                                <span className="text-gray-500 text-sm">
                  Position: {comment.start} - {comment.end}
                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Comment Modal */}
            {showCommentInput && selection && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    {/* Modal Overlay */}
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={() => setShowCommentInput(false)} // Close modal on overlay click
                    ></div>
                    {/* Modal Content */}
                    <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-11/12 md:w-2/3 lg:w-1/2">
                        <h3 className="text-gray-800 text-xl font-semibold mb-4">Add Comment</h3>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={4}
                            placeholder="Add your comment here..."
                            className="w-full bg-white text-black p-2 border border-gray-300 rounded-lg"
                        />
                        <div className="mt-4 flex items-center">
                            <label className="text-gray-800 mr-2">Select Highlight Color:</label>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-10 h-10 p-0 border-none"
                            />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowCommentInput(false)}
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg mr-2 hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addComment}
                                className="bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800"
                            >
                                Add Comment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
