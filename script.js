// متغيرات عامة
let currentPdf = null;
let currentPage = 1;
let totalPages = 0;
let pdfDoc = null;
let isDrawing = false;
let currentTool = 'text';
let drawingHistory = [];

// عناصر DOM
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadSection = document.getElementById('uploadSection');
const editorSection = document.getElementById('editorSection');
const pdfCanvas = document.getElementById('pdfCanvas');
const drawingCanvas = document.getElementById('drawingCanvas');
const ctx = pdfCanvas.getContext('2d');
const drawCtx = drawingCanvas.getContext('2d');

// أدوات التحرير
const textTool = document.getElementById('textTool');
const drawTool = document.getElementById('drawTool');
const highlightTool = document.getElementById('highlightTool');
const shapeTool = document.getElementById('shapeTool');
const fontSize = document.getElementById('fontSize');
const colorPicker = document.getElementById('colorPicker');

// أزرار التحكم
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const addPage = document.getElementById('addPage');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newFileBtn = document.getElementById('newFileBtn');

// إعداد PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});
function setupEventListeners() {
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    textTool.addEventListener('click', () => setTool('text'));
    drawTool.addEventListener('click', () => setTool('draw'));
    highlightTool.addEventListener('click', () => setTool('highlight'));
    shapeTool.addEventListener('click', () => setTool('shape'));
    prevPage.addEventListener('click', () => changePage(-1));
    nextPage.addEventListener('click', () => changePage(1));
    addPage.addEventListener('click', addNewPage);
    undoBtn.addEventListener('click', undo);
    clearBtn.addEventListener('click', clearAll);
    downloadBtn.addEventListener('click', downloadPdf);
    newFileBtn.addEventListener('click', newFile);
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('click', handleCanvasClick);
}
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadPdf(file);
    } else {
        alert('يرجى اختيار ملف PDF صالح');
    }
}
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
}
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
}
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        loadPdf(files[0]);
    } else {
        alert('يرجى إسقاط ملف PDF صالح');
    }
}
async function loadPdf(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        currentPdf = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;
        pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        showEditor();
        await renderPage();
        updatePageInfo();
    } catch (error) {
        console.error('خطأ في تحميل PDF:', error);
        alert('حدث خطأ في تحميل الملف. يرجى المحاولة مرة أخرى.');
    }
}
function showEditor() {
    uploadSection.style.display = 'none';
    editorSection.style.display = 'block';
}
async function renderPage() {
    if (!currentPdf) return;
    const page = await currentPdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.5 });
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    drawingCanvas.width = viewport.width;
    drawingCanvas.height = viewport.height;
    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };
    await page.render(renderContext).promise;
    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tool + 'Tool').classList.add('active');
    drawingCanvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
}
function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPage();
        updatePageInfo();
    }
}
function updatePageInfo() {
    pageInfo.textContent = `صفحة ${currentPage} من ${totalPages}`;
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
}
async function addNewPage() {
    if (!pdfDoc) return;
    try {
        pdfDoc.addPage();
        totalPages++;
        currentPage = totalPages;
        const pdfBytes = await pdfDoc.save();
        const pdf = await pdfjsLib.getDocument(pdfBytes).promise;
        currentPdf = pdf;
        await renderPage();
        updatePageInfo();
    } catch (error) {
        console.error('خطأ في إضافة صفحة:', error);
        alert('حدث خطأ في إضافة الصفحة');
    }
}
function startDrawing(event) {
    if (currentTool !== 'draw' && currentTool !== 'highlight') return;
    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    drawCtx.beginPath();
    drawCtx.moveTo(x, y);
    if (currentTool === 'highlight') {
        drawCtx.globalCompositeOperation = 'multiply';
        drawCtx.globalAlpha = 0.3;
        drawCtx.lineWidth = 20;
    } else {
        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.globalAlpha = 1;
        drawCtx.lineWidth = 2;
    }
    drawCtx.strokeStyle = colorPicker.value;
    drawCtx.lineCap = 'round';
}
function draw(event) {
    if (!isDrawing) return;
    const rect = drawingCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
}
function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveDrawingState();
    }
}
function handleCanvasClick(event) {
    if (currentTool === 'text') {
        const rect = drawingCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const text = prompt('أدخل النص:');
        if (text) {
            addText(x, y, text);
        }
    }
}
function addText(x, y, text) {
    drawCtx.font = `${fontSize.value}px Cairo, Arial, sans-serif`;
    drawCtx.fillStyle = colorPicker.value;
    drawCtx.fillText(text, x, y);
    saveDrawingState();
}
function saveDrawingState() {
    const imageData = drawCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingHistory.push(imageData);
    if (drawingHistory.length > 20) {
        drawingHistory.shift();
    }
}
function undo() {
    if (drawingHistory.length > 1) {
        drawingHistory.pop();
        const previousState = drawingHistory[drawingHistory.length - 1];
        drawCtx.putImageData(previousState, 0, 0);
    }
}
function clearAll() {
    if (confirm('هل تريد مسح جميع التعديلات من هذه الصفحة؟')) {
        drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawingHistory = [];
    }
}
async function downloadPdf() {
    if (!pdfDoc) return;
    try {
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited-document.pdf';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('خطأ في تحميل PDF:', error);
        alert('حدث خطأ في تحميل الملف');
    }
}
function newFile() {
    if (confirm('هل تريد البدء بملف جديد؟')) {
        currentPdf = null;
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        drawingHistory = [];
        editorSection.style.display = 'none';
        uploadSection.style.display = 'block';
        fileInput.value = '';
    }
}
setTool('text');