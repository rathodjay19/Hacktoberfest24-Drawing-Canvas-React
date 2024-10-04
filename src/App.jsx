import React, { useRef, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import './App.css';

function App() {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [fileName, setFileName] = useState('drawing');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [currentTool, setCurrentTool] = useState('brush');
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [canvasData, setCanvasData] = useState(null);

    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [rectangleColor, setRectangleColor] = useState('#000000');
    const [rectangleSize, setRectangleSize] = useState(5);
    const [circleColor, setCircleColor] = useState('#000000');
    const [circleSize, setCircleSize] = useState(5);
    const [lineColor, setLineColor] = useState('#000000');
    const [lineSize, setLineSize] = useState(5);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const context = canvas.getContext('2d');
        context.scale(2, 2);
        context.lineCap = 'round';
        contextRef.current = context;

        loadCanvasData();
        loadFileName();

        //  event   storage changes to sync across tabs
        window.addEventListener('storage', syncCanvasAcrossTabs);

        return () => {
            window.removeEventListener('storage', syncCanvasAcrossTabs);
        };
    }, []);

    useEffect(() => {
        if (contextRef.current) {
            switch (currentTool) {
                case 'brush':
                    contextRef.current.strokeStyle = brushColor;
                    contextRef.current.lineWidth = brushSize;
                    break;
                case 'rectangle':
                    contextRef.current.strokeStyle = rectangleColor;
                    contextRef.current.lineWidth = rectangleSize;
                    break;
                case 'circle':
                    contextRef.current.strokeStyle = circleColor;
                    contextRef.current.lineWidth = circleSize;
                    break;
                case 'line':
                    contextRef.current.strokeStyle = lineColor;
                    contextRef.current.lineWidth = lineSize;
                    break;
                default:
                    break;
            }
        }
    }, [brushColor, brushSize, rectangleColor, rectangleSize, circleColor, circleSize, lineColor, lineSize, currentTool]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setStartX(offsetX);
        setStartY(offsetY);
        setIsDrawing(true);

        setCanvasData(canvasRef.current.toDataURL());
        if (currentTool === 'brush') {
            contextRef.current.beginPath();
            contextRef.current.moveTo(offsetX, offsetY);
        }
    };

    const drawShape = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;

        if (currentTool === 'brush') {
            contextRef.current.lineTo(offsetX, offsetY);
            contextRef.current.stroke();
            return;
        }

        const image = new Image();
        image.src = canvasData;
        image.onload = () => {
            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            contextRef.current.drawImage(image, 0, 0, canvasRef.current.width / 2, canvasRef.current.height / 2);

            switch (currentTool) {
                case 'rectangle':
                    drawRectangle(startX, startY, offsetX, offsetY);
                    break;
                case 'circle':
                    drawCircle(startX, startY, offsetX, offsetY);
                    break;
                case 'line':
                    drawLine(startX, startY, offsetX, offsetY);
                    break;
                default:
                    break;
            }
        };
    };

    const finishDrawing = () => {
        setIsDrawing(false);
        saveCanvasData();
        if (currentTool === 'brush') {
            contextRef.current.closePath();
        }
    };

    const drawRectangle = (x1, y1, x2, y2) => {
        const width = x2 - x1;
        const height = y2 - y1;
        contextRef.current.beginPath();
        contextRef.current.rect(x1, y1, width, height);
        contextRef.current.stroke();
        contextRef.current.closePath();
    };

    const drawCircle = (x1, y1, x2, y2) => {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        contextRef.current.beginPath();
        contextRef.current.arc(x1, y1, radius, 0, 2 * Math.PI);
        contextRef.current.stroke();
        contextRef.current.closePath();
    };

    const drawLine = (x1, y1, x2, y2) => {
        contextRef.current.beginPath();
        contextRef.current.moveTo(x1, y1);
        contextRef.current.lineTo(x2, y2);
        contextRef.current.stroke();
        contextRef.current.closePath();
    };

    const clearCanvas = () => {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveCanvasData();
    };

    const exportCanvasAsImage = (format) => {
        const canvas = canvasRef.current;
        const image = canvas.toDataURL(`image/${format}`);
        const anchor = document.createElement('a');
        anchor.href = image;
        anchor.download = `${fileName}.${format}`;
        anchor.click();
        setIsDropdownOpen(false);
    };

    const downloadPDF = () => {
        const canvas = canvasRef.current;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height],
            putOnlyUsedFonts: true,
            floatPrecision: 16,
        });

        const imgData = canvas.toDataURL('image/jpeg');
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName}.pdf`);
        setIsDropdownOpen(false);
    };

    const handleDownload = (format) => {
        if (format === 'pdf') {
            downloadPDF();
        } else {
            exportCanvasAsImage(format);
        }
    };

    //save CanvasData  
    const saveCanvasData = () => {
        const canvas = canvasRef.current;
        const canvasData = canvas.toDataURL();
        localStorage.setItem('savedCanvas', canvasData);
         localStorage.setItem('canvasUpdateTime', Date.now());
    };

    const loadCanvasData = () => {
        const savedCanvas = localStorage.getItem('savedCanvas');
        if (savedCanvas) {
            const canvas = canvasRef.current;
            const context = contextRef.current;
            const image = new Image();
            image.src = savedCanvas;
            image.onload = () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width / 2, canvas.height / 2);
            };
        }
    };

    const saveFileName = (newFileName) => {
        localStorage.setItem('fileName', newFileName);
    };

    const loadFileName = () => {
        const savedFileName = localStorage.getItem('fileName');
        if (savedFileName) {
            setFileName(savedFileName);
        }
    };

     const syncCanvasAcrossTabs = (event) => {
        if (event.key === 'savedCanvas') {
            loadCanvasData();
        }
    };

    return (
        <div className="App">
            <h1>Collaborative Drawing Canvas</h1>
            <div className="toolbar">
                <button
                    className={`tool-button ${currentTool === 'brush' ? 'selected' : ''}`}
                    onClick={() => setCurrentTool('brush')}
                >
                    Brush
                </button>
                <button
                    className={`tool-button ${currentTool === 'rectangle' ? 'selected' : ''}`}
                    onClick={() => setCurrentTool('rectangle')}
                >
                    Rectangle
                </button>
                <button
                    className={`tool-button ${currentTool === 'circle' ? 'selected' : ''}`}
                    onClick={() => setCurrentTool('circle')}
                >
                    Circle
                </button>
                <button
                    className={`tool-button ${currentTool === 'line' ? 'selected' : ''}`}
                    onClick={() => setCurrentTool('line')}
                >
                    Line
                </button>

                {currentTool === 'brush' && (
                    <>
                        <label>
                            Brush Color:
                            <input
                                type="color"
                                value={brushColor}
                                onChange={(e) => setBrushColor(e.target.value)}
                            />
                        </label>
                        <label>
                            Brush Size:
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={brushSize}
                                onChange={(e) => setBrushSize(e.target.value)}
                            />
                        </label>
                    </>
                )}
                {currentTool === 'rectangle' && (
                    <>
                        <label>
                            Rectangle Color:
                            <input
                                type="color"
                                value={rectangleColor}
                                onChange={(e) => setRectangleColor(e.target.value)}
                            />
                        </label>
                        <label>
                            Rectangle Size:
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={rectangleSize}
                                onChange={(e) => setRectangleSize(e.target.value)}
                            />
                        </label>
                    </>
                )}
                {currentTool === 'circle' && (
                    <>
                        <label>
                            Circle Color:
                            <input
                                type="color"
                                value={circleColor}
                                onChange={(e) => setCircleColor(e.target.value)}
                            />
                        </label>
                        <label>
                            Circle Size:
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={circleSize}
                                onChange={(e) => setCircleSize(e.target.value)}
                            />
                        </label>
                    </>
                )}
                {currentTool === 'line' && (
                    <>
                        <label>
                            Line Color:
                            <input
                                type="color"
                                value={lineColor}
                                onChange={(e) => setLineColor(e.target.value)}
                            />
                        </label>
                        <label>
                            Line Size:
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={lineSize}
                                onChange={(e) => setLineSize(e.target.value)}
                            />
                        </label>
                    </>
                )}

                <button className="clear-button" onClick={clearCanvas}>
                    Clear Canvas
                </button>

                <input
                    type="text"
                    value={fileName}
                    onChange={(e) => {
                        setFileName(e.target.value);
                        saveFileName(e.target.value);
                    }}
                    placeholder="File Name"
                />
                <div className="dropdown">
                    <button
                        className="download-button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        Download
                    </button>
                    {isDropdownOpen && (
                        <ul className="dropdown-menu">
                            <li onClick={() => handleDownload('jpeg')}>Download JPEG</li>
                            <li onClick={() => handleDownload('png')}>Download PNG</li>
                            <li onClick={() => handleDownload('pdf')}>Download PDF</li>
                        </ul>
                    )}
                </div>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={drawShape}
                onMouseUp={finishDrawing}
                onMouseLeave={finishDrawing}
            />
        </div>
    );
}

export default App;
