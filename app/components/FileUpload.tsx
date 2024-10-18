"use client";

import React, { useState, useRef} from 'react';
import { MathJaxContext, MathJax as MathJaxComponent } from 'better-react-mathjax';
import { Tooltip } from 'react-tooltip';
import { FaComments, FaCopy,FaTrash, FaEdit, FaFileUpload } from 'react-icons/fa';
import Modal from './Modal'; // Ensure Modal.tsx is correctly implemented

// Interface for comments
interface Comment {
    id: number;       // Unique identifier for each comment
    text: string;     // The comment text
    start: number;    // Start index of the selected text
    end: number;      // End index of the selected text
    color: string;    // Color of the highlight
}

// Interface for uploaded files
interface UploadedFile {
    id: number;          // Unique identifier for each file
    name: string;        // File name
    content: string;     // File content
    comments: Comment[]; // Comments associated with the file
}

const FileUpload: React.FC = () => {
    const [files, setFiles] = useState<UploadedFile[]>([]); // State to manage multiple files
    const [selectedFileId, setSelectedFileId] = useState<number | null>(null); // Currently selected file
    const [newComment, setNewComment] = useState<string>('');
    const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
    const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
    const [showComments] = useState<boolean>(true);

    // State for highlighted text modal and comment modal
    const [highlightedText, setHighlightedText] = useState<string>(''); // To store the highlighted text
    const [isHighlightModalOpen, setIsHighlightModalOpen] = useState<boolean>(false); // For highlighting modal
    const [isAddCommentModalOpen, setIsAddCommentModalOpen] = useState<boolean>(false); // For add comment modal

    // States for editing comments
    const [editCommentId, setEditCommentId] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState<string>('');
    const [editCommentColor, setEditCommentColor] = useState<string>('#ffeb3b');
    const [isEditCommentModalOpen, setIsEditCommentModalOpen] = useState<boolean>(false); // To control the edit modal

    // Refs for preview
    const previewRef = useRef<HTMLDivElement | null>(null);

    // State for view mode
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    // Helper function to calculate the character index from the start of the container to the selection point
    const getCharacterIndex = (node: Node, offset: number, container: Node): number => {
        let index = 0;
        const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        while (treeWalker.nextNode()) {
            const currentNode = treeWalker.currentNode;
            if (currentNode === node) {
                index += offset;
                break;
            } else {
                index += currentNode.textContent?.length || 0;
            }
        }
        return index;
    };

    // Function to handle multiple file uploads using Promise.all
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (uploadedFiles && uploadedFiles.length > 0) {
            const fileArray = Array.from(uploadedFiles);
            const readFilesPromises = fileArray.map(file => {
                return new Promise<UploadedFile>((resolve, reject) => {
                    const fileExtension = file.name.split('.').pop()?.toLowerCase();
                    if (fileExtension === 'txt' || fileExtension === 'md' || fileExtension === 'latex') {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve({
                                id: Date.now() + Math.random(),
                                name: file.name,
                                content: reader.result?.toString() || '',
                                comments: [],
                            });
                        };
                        reader.onerror = () => {
                            reject(new Error(`Failed to read file: ${file.name}`));
                        };
                        reader.readAsText(file);
                    } else {
                        reject(new Error(`Unsupported file format: ${file.name}`));
                    }
                });
            });

            // Use Promise.all to handle multiple file reads
            Promise.all(readFilesPromises)
                .then(newFiles => {
                    setFiles(prevFiles => [...prevFiles, ...newFiles]);
                    // If no file is selected, select the first newly uploaded file
                    if (selectedFileId === null && newFiles.length > 0) {
                        setSelectedFileId(newFiles[0].id);
                    }
                })
                .catch(error => {
                    alert(error.message);
                });

            // Reset the input value to allow uploading the same file again if needed
            event.target.value = '';
        }
    };

    // Get the currently selected file
    const selectedFile = files.find(file => file.id === selectedFileId) || null;

    // Handle text selection in the preview area
    const handlePreviewSelection = () => {
        const selectionObj = window.getSelection();
        if (selectionObj && selectionObj.rangeCount > 0 && selectionObj.toString().length > 0) {
            const range = selectionObj.getRangeAt(0);

            const startNode = range.startContainer;
            const startOffset = range.startOffset;
            const endNode = range.endContainer;
            const endOffset = range.endOffset;

            const start = getCharacterIndex(startNode, startOffset, previewRef.current!);
            const end = getCharacterIndex(endNode, endOffset, previewRef.current!);

            if (start !== -1 && end > start && selectedFile) {
                setSelection({ start, end });

                // Get the highlighted text
                const highlightedText = selectionObj.toString();

                // Store the highlighted text and open the modal
                setHighlightedText(highlightedText); // State to hold the highlighted text
                setIsHighlightModalOpen(true); // Open the modal
            }
        }
    };

    // Function to add a new comment
    const addComment = () => {
        if (newComment && selection && selectedFile) {
            const newCommentData: Comment = {
                id: selectedFile.comments.length > 0 ? Math.max(...selectedFile.comments.map(c => c.id)) + 1 : 1,
                text: newComment,
                start: selection.start,
                end: selection.end,
                color: selectedColor,
            };
            setFiles(prevFiles => prevFiles.map(file =>
                file.id === selectedFile.id ? { ...file, comments: [...file.comments, newCommentData] } : file
            ));
            setNewComment('');
            setSelection(null);
            setIsAddCommentModalOpen(false);
            setSelectedColor('#ffeb3b'); // Reset the selected color
        } else {
            alert('Please enter a comment.');
        }
    };

    // Function to delete a comment
    const handleDeleteComment = (commentId: number) => {
        if (selectedFile) {
            const updatedComments = selectedFile.comments.filter(comment => comment.id !== commentId);
            setFiles(prevFiles => prevFiles.map(file =>
                file.id === selectedFile.id ? { ...file, comments: updatedComments } : file
            ));
        }
    };

    // Function to download the selected file as PDF
    const downloadAsPDF = () => {
        if (!selectedFile) {
            alert('No file selected.');
            return;
        }

        // Prepare the JSON data
        const data = { latexCode: selectedFile.content };

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
                const pdfFileName = selectedFile.name ? selectedFile.name.replace(/\.[^/.]+$/, '') + '.pdf' : 'document.pdf';
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

    // Function to initiate editing a comment
    const handleEditComment = (commentId: number) => {
        if (selectedFile) {
            const commentToEdit = selectedFile.comments.find(comment => comment.id === commentId);
            if (commentToEdit) {
                setEditCommentId(commentId);
                setEditCommentText(commentToEdit.text);
                setEditCommentColor(commentToEdit.color);
                setIsEditCommentModalOpen(true);
            }
        }
    };

    // Function to save edited comment
    const saveEditedComment = () => {
        if (editCommentId !== null && selectedFile) {
            const updatedComments = selectedFile.comments.map(comment => {
                if (comment.id === editCommentId) {
                    return {
                        ...comment,
                        text: editCommentText,
                        color: editCommentColor,
                    };
                }
                return comment;
            });
            setFiles(prevFiles => prevFiles.map(file =>
                file.id === selectedFile.id ? { ...file, comments: updatedComments } : file
            ));
            setEditCommentId(null);
            setEditCommentText('');
            setEditCommentColor('#ffeb3b');
            setIsEditCommentModalOpen(false);
        }
    };

    // Function to render the preview content with highlights
    const renderPreviewContent = () => {
        if (!selectedFile) return null;

        let content = selectedFile.content;

        // Sort comments in reverse order to prevent indexing issues
        const sortedComments = [...selectedFile.comments].sort((a, b) => b.start - a.start);

        sortedComments.forEach((comment) => {
            const before = content.slice(0, comment.start);
            const highlighted = content.slice(comment.start, comment.end);
            const after = content.slice(comment.end);

            content = `${before}<span class="commented-text" data-id="${comment.id}" style="background-color: ${
                comment.color
            }; border-radius: 4px; padding: 2px;">${highlighted}</span>${after}`;
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
            {/* File Upload Section */}
            <div className="w-full max-w-4xl mx-auto mb-6">
                <label htmlFor="file-upload" className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-black transition">
                    <FaFileUpload className="mr-2 text-gray-600" size={24} />
                    <span className="text-gray-600">Click to upload files (.txt, .md, .latex)</span>
                </label>
                <input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
                <div className="w-full max-w-4xl mx-auto mb-6">
                    <h2 className="text-gray-800 mb-2 text-lg font-semibold">Uploaded Files:</h2>
                    <ul className="flex flex-wrap gap-2">
                        {files.map(file => (
                            <li
                                key={file.id}
                                className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                                    selectedFileId === file.id
                                        ? 'bg-black text-white'
                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                                onClick={() => setSelectedFileId(file.id)}
                            >
                                <span>{file.name}</span>
                                <FaTrash
                                    className="text-red-500 hover:text-red-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFiles(prevFiles => prevFiles.filter(f => f.id !== file.id));
                                    }}
                                    title="Delete File"
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* File Editor or Preview Section */}
            {selectedFile && (
                <div className="w-full max-w-4xl mx-auto">
                    {/* Toggle Button */}
                    <div className="w-full flex justify-end mb-4">
                        <button
                            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                            className="bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800 flex items-center space-x-2"
                        >
                            {viewMode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
                        </button>
                    </div>

                    {viewMode === 'edit' ? (
                        <div className="flex flex-col items-center">
                            <h3 className="text-gray-800 mb-2 text-lg font-semibold">Edit Content:</h3>
                            <textarea
                                id="editor-textarea"
                                value={selectedFile.content}
                                onChange={(e) => {
                                    const updatedContent = e.target.value;
                                    if ("id" in selectedFile) {
                                        setFiles(prevFiles => prevFiles.map(file =>
                                            file.id === selectedFile.id ? {...file, content: updatedContent} : file
                                        ));
                                    }
                                }}
                                rows={15}
                                className="w-full bg-white text-black p-4 border border-gray-300 rounded-lg shadow-sm resize-none h-96"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row w-full">
                            {/* LaTeX Preview Section */}
                            <div className="flex-1 flex flex-col items-center">
                                <h3 className="text-gray-800 mb-2 text-lg font-semibold">LaTeX Preview:</h3>
                                <p className="text-gray-600 mb-2">
                                    To add a comment, highlight the text in the preview area.
                                </p>
                                <div
                                    id="latex-preview"
                                    className="w-full bg-white p-4 text-black border border-gray-300 rounded-lg shadow-sm relative overflow-auto"
                                    onMouseUp={handlePreviewSelection}
                                    ref={previewRef}
                                >
                                    <MathJaxContext>
                                        <MathJaxComponent dynamic>
                                            {renderPreviewContent()}
                                        </MathJaxComponent>
                                    </MathJaxContext>
                                    <Tooltip id="comment-tooltip" place="top" />
                                </div>

                                {/* Download as PDF Button in Preview Mode */}
                                <button
                                    onClick={downloadAsPDF}
                                    className="mt-4 bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800 shadow-md flex items-center space-x-2"
                                >
                                    <FaCopy />
                                    <span>Download as PDF</span>
                                </button>
                            </div>

                            {/* Sidebar for Comments */}
                            {showComments && (
                                <div className="w-full md:w-1/3 bg-white p-4 rounded-lg shadow-lg mt-8 md:mt-0 md:ml-4 overflow-auto max-h-96">
                                    <h3 className="text-gray-800 mb-4 text-xl font-bold flex items-center">
                                        <FaComments className="mr-2" /> Comments
                                    </h3>
                                    {selectedFile.comments.length === 0 ? (
                                        <p className="text-gray-600">No comments yet.</p>
                                    ) : (
                                        selectedFile.comments.map(comment => (
                                            <div key={comment.id} className="bg-gray-100 p-3 mb-3 border border-gray-200 rounded-lg">
                                                <strong style={{ color: "black" }}>Comment {comment.id}:</strong>
                                                <p className="text-black">{comment.text}</p>
                                                <span className="text-gray-500 text-sm">
                                                    Position: {comment.start} - {comment.end}
                                                </span>
                                                <div className="mt-2 flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditComment(comment.id)}
                                                        className="bg-black text-white py-1 px-2 rounded hover:bg-zinc-800 flex items-center space-x-1"
                                                    >
                                                        <FaEdit size={14} />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600 flex items-center space-x-1"
                                                    >
                                                        <FaTrash size={14} />
                                                        <span>Delete</span>
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

            {/* Highlight Modal */}
            <Modal isOpen={isHighlightModalOpen} onClose={() => setIsHighlightModalOpen(false)}>
                <h3 className="text-gray-800 text-xl font-semibold mb-4">Highlighted Text</h3>
                <p className="bg-gray-100 p-4 border rounded-lg mb-4 text-black">
                    {highlightedText}
                </p>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(highlightedText);
                            alert('Text copied to clipboard!');
                            setIsHighlightModalOpen(false);
                        }}
                        className="bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800"
                    >
                        Copy-Paste
                    </button>
                    <button
                        onClick={() => {
                            setIsAddCommentModalOpen(true);
                            setIsHighlightModalOpen(false);
                        }}
                        className="bg-black text-white py-2 px-4 rounded-lg hover:bg-zinc-800"
                    >
                        Add Comment
                    </button>
                </div>
            </Modal>

            {/* Add Comment Modal */}
            <Modal isOpen={isAddCommentModalOpen} onClose={() => setIsAddCommentModalOpen(false)}>
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
                        onClick={() => setIsAddCommentModalOpen(false)}
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
            </Modal>

            {/* Edit Comment Modal */}
            <Modal isOpen={isEditCommentModalOpen} onClose={() => setIsEditCommentModalOpen(false)}>
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
                        onClick={() => setIsEditCommentModalOpen(false)}
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
            </Modal>
        </div>
    );
};

export default FileUpload;
