"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MathJaxContext, MathJax as MathJaxComponent } from 'better-react-mathjax';
import { Tooltip } from 'react-tooltip';
import { FaComments, FaCopy, FaRegCommentDots } from 'react-icons/fa';

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

    // States for editing comments
    const [editCommentId, setEditCommentId] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState<string>('');
    const [editCommentColor, setEditCommentColor] = useState<string>('#ffeb3b');
    const [showEditModal, setShowEditModal] = useState<boolean>(false);

    // States for action icons
    const [showActionIcons, setShowActionIcons] = useState<boolean>(false);
    const [iconPosition, setIconPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const selectedTextRef = useRef<string>('');

    // Updated refs with null included in type
    const previewRef = useRef<HTMLDivElement | null>(null);
    const actionIconsRef = useRef<HTMLDivElement | null>(null);

    // New state for view mode
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    // Function to handle file upload
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

    // Function to handle changes in the editor textarea
    const handleEditorChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditorContent(event.target.value);
    };

    // Handle text selection in the preview area
    const handlePreviewSelection = () => {
        const selectionObj = window.getSelection();
        if (selectionObj && selectionObj.rangeCount > 0 && selectionObj.toString().length > 0) {
            const selectedText = selectionObj.toString();
            const range = selectionObj.getRangeAt(0);

            // Calculate start and end indices based on the selection
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(previewRef.current!);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;
            const end = start + selectedText.length;

            if (start !== -1 && end > start) {
                setSelection({ start, end });
                selectedTextRef.current = selectedText;

                // Create a temporary span element to determine position
                const tempSpan = document.createElement('span');
                tempSpan.style.position = 'absolute';
                tempSpan.style.backgroundColor = 'transparent';
                tempSpan.textContent = '\u200b'; // Zero-width space

                // Insert the span at the range
                range.insertNode(tempSpan);

                // Get the position of the span
                const rect = tempSpan.getBoundingClientRect();
                const previewRect = previewRef.current!.getBoundingClientRect();

                if (rect && previewRect) {
                    const scrollY = window.scrollY || window.pageYOffset;
                    const scrollX = window.scrollX || window.pageXOffset;
                    setIconPosition({
                        x: rect.left + rect.width / 2 + scrollX - previewRect.left - 40, // Adjust as needed
                        y: rect.top + scrollY - previewRect.top - 50, // Adjust as needed
                    });
                }

                // Clean up: Remove the temporary span
                tempSpan.parentNode?.removeChild(tempSpan);

                setShowActionIcons(true);
            }
        } else {
            // Hide action icons if no text is selected
            setShowActionIcons(false);
            setSelection(null);
        }
    };

    // Function to handle copy action
    const handleCopy = () => {
        console.log('handleCopy called'); // Debugging log
        navigator.clipboard.writeText(selectedTextRef.current)
            .then(() => {
                alert('Text copied to clipboard!');
                setShowActionIcons(false);
            })
            .catch((error) => {
                console.error('Copy failed:', error);
            });
    };

    // Function to handle opening the add comment modal
    const handleAddComment = () => {
        console.log('handleAddComment called'); // Debugging log
        setShowCommentInput(true);
        setShowActionIcons(false);
    };

    // Function to add a new comment
    const addComment = () => {
        console.log('addComment called'); // Debugging log
        if (newComment && selection) {
            console.log('Adding comment:', newComment, 'with selection:', selection); // Debugging log
            const newCommentData: Comment = {
                id: comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1,
                text: newComment,
                start: selection.start,
                end: selection.end,
                color: selectedColor,
            };
            setComments([...comments, newCommentData]);
            setNewComment('');
            setSelection(null);
            setShowCommentInput(false);
            setSelectedColor('#ffeb3b'); // Reset the selected color
        } else {
            alert('Please enter a comment.');
        }
    };

    // Function to delete a comment
    const handleDeleteComment = (id: number) => {
        const updatedComments = comments.filter(comment => comment.id !== id);
        setComments(updatedComments);
    };

    // Function to initiate editing a comment
    const handleEditComment = (id: number) => {
        const commentToEdit = comments.find(comment => comment.id === id);
        if (commentToEdit) {
            setEditCommentId(id);
            setEditCommentText(commentToEdit.text);
            setEditCommentColor(commentToEdit.color);
            setShowEditModal(true);
        }
    };

    // Function to save edited comment
    const saveEditedComment = () => {
        if (editCommentId !== null) {
            const updatedComments = comments.map(comment => {
                if (comment.id === editCommentId) {
                    return {
                        ...comment,
                        text: editCommentText,
                        color: editCommentColor,
                    };
                }
                return comment;
            });
            setComments(updatedComments);
            setEditCommentId(null);
            setEditCommentText('');
            setEditCommentColor('#ffeb3b');
            setShowEditModal(false);
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

    // Use effect to hide action icons when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const previewElement = previewRef.current;
            const actionIconsElement = actionIconsRef.current;

            if (
                previewElement &&
                !previewElement.contains(event.target as Node) &&
                actionIconsElement &&
                !actionIconsElement.contains(event.target as Node)
            ) {
                setShowActionIcons(false);
                setSelection(null);
            }
        };
        document.addEventListener('click', handleClickOutside); // Changed from 'mousedown' to 'click'
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Function to render the preview content with highlights
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
        <div className="flex flex-col items-center w-full relative px-4 md:px-8 lg:px-16">
            <input
                type="file"
                onChange={handleFileUpload}
                className="mb-4 p-2 border border-gray-300 rounded-lg"
            />

            {fileContent && (
                <div className="w-full max-w-4xl mx-auto">
                    {/* Toggle Button */}
                    <div className="w-full flex justify-end mb-4">
                        <button
                            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                        >
                            {viewMode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
                        </button>
                    </div>

                    {viewMode === 'edit' ? (
                        <div className="flex flex-col items-center">
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
                                rows={15} // Increased number of rows for longer editing area
                                className="w-full bg-white text-black p-4 border border-gray-300 rounded-lg shadow-sm resize-none h-96" // Added fixed height
                            />
                            {/* Removed the Download as PDF button from Edit mode */}
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row w-full">
                            {/* LaTeX Preview Section */}
                            <div className="flex-1 flex flex-col items-center">
                                <h3 className="text-gray-800 mb-2 text-lg font-semibold">LaTeX Preview:</h3>
                                {/* Instruction text */}
                                <p className="text-gray-600 mb-2">
                                    To add a comment, highlight the text in the preview area.
                                </p>
                                <div
                                    id="latex-preview"
                                    className="w-full bg-white p-4 text-black border border-gray-300 rounded-lg shadow-sm relative"
                                    onMouseUp={handlePreviewSelection} // Handle text selection in preview
                                    ref={previewRef}
                                >
                                    <MathJaxContext>
                                        <MathJaxComponent dynamic>
                                            <div>
                                                {renderPreviewContent()}
                                            </div>
                                        </MathJaxComponent>
                                    </MathJaxContext>
                                    <Tooltip id="comment-tooltip" />
                                    {/* Action Icons */}
                                    {showActionIcons && (
                                        <div
                                            ref={actionIconsRef}
                                            style={{ top: iconPosition.y, left: iconPosition.x, position: 'absolute', zIndex: 9999 }}
                                            className="flex space-x-2 bg-yellow-100 p-2 rounded-lg shadow"
                                            onClick={(e) => e.stopPropagation()} // Prevent event propagation
                                        >
                                            {/* Copy Button */}
                                            <button
                                                onClick={() => { console.log('Copy button clicked'); handleCopy(); }}
                                                className="bg-white border border-gray-300 p-2 rounded-full shadow hover:bg-gray-100"
                                                title="Copy"
                                            >
                                                <FaCopy className="text-black" />
                                            </button>
                                            {/* Add Comment Button */}
                                            <button
                                                onClick={() => { console.log('Add Comment button clicked'); handleAddComment(); }}
                                                className="bg-white border border-gray-300 p-2 rounded-full shadow hover:bg-gray-100"
                                                title="Add Comment"
                                            >
                                                <FaRegCommentDots className="text-black" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Button to download PDF */}
                                <button
                                    onClick={downloadAsPDF}
                                    className="mt-4 bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800 shadow-md"
                                >
                                    Download as PDF
                                </button>
                            </div>

                            {/* Sidebar for Comments - Only displayed in preview mode */}
                            {showComments && (
                                <div className="w-full md:w-1/3 bg-white p-4 rounded-lg shadow-lg mt-4 md:mt-0 md:ml-4">
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
                                                {/* Add Edit and Delete buttons */}
                                                <div className="mt-2 flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditComment(comment.id)}
                                                        className="bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Comments Sidebar Toggle Button - Only in preview mode */}
            {fileContent && viewMode === 'preview' && (
                <button
                    onClick={() => setShowComments(!showComments)}
                    className="absolute top-4 right-4 bg-black text-white p-2 rounded-full shadow-lg hover:bg-zinc-800 z-50"
                    title={showComments ? 'Hide Comments' : 'Show Comments'}
                >
                    <FaComments size={20} />
                </button>
            )}

            {/* Add Comment Modal */}
            {showCommentInput && selection && (
                <div className="fixed inset-0 flex items-center justify-center z-60" style={{ zIndex: 1001 }}>
                    {/* Modal Overlay */}
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={() => setShowCommentInput(false)} // Close modal on overlay click
                    ></div>
                    {/* Modal Content */}
                    <div
                        className="bg-white p-6 rounded-lg shadow-lg z-60 w-11/12 md:w-2/3 lg:w-1/2"
                        style={{ zIndex: 1001 }} // Ensure the modal is above action icons
                    >
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

            {/* Edit Comment Modal */}
            {showEditModal && editCommentId !== null && (
                <div className="fixed inset-0 flex items-center justify-center z-60" style={{ zIndex: 1002 }}>
                    {/* Modal Overlay */}
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={() => setShowEditModal(false)} // Close modal on overlay click
                    ></div>
                    {/* Modal Content */}
                    <div
                        className="bg-white p-6 rounded-lg shadow-lg z-60 w-11/12 md:w-2/3 lg:w-1/2"
                        style={{ zIndex: 1002 }} // Ensure the modal is above action icons
                    >
                        <h3 className="text-gray-800 text-xl font-semibold mb-4">Edit Comment</h3>
                        <textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            rows={4}
                            placeholder="Edit your comment here..."
                            className="w-full bg-white text-black p-2 border border-gray-300 rounded-lg"
                        />
                        <div className="mt-4 flex items-center">
                            <label className="text-gray-800 mr-2">Select Highlight Color:</label>
                            <input
                                type="color"
                                value={editCommentColor}
                                onChange={(e) => setEditCommentColor(e.target.value)}
                                className="w-10 h-10 p-0 border-none"
                            />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg mr-2 hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEditedComment}
                                className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};

export default FileUpload;
