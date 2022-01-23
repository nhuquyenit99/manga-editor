import React, { useRef, useState, useEffect, useContext, forwardRef, useImperativeHandle } from 'react';
import CanvasDraw from 'react-canvas-draw';
import { notification } from 'antd';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretLeft, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { EraserContext, ImageContext, TextBoxContext } from '../../context';
import { LoadingFullView } from '../loading';
import { useImageSize } from '../../utils';
import { TextBox } from '../text-box';
import './style.scss';

type PDFViewerProps = {
    url: string,
    imageRef: any
    panel: 'crop' | 'text' | 'draw' | 'erase';
    textBoxDraggable?: boolean
}

export const PDFViewer = forwardRef(({ 
    url, imageRef, panel = 'text', textBoxDraggable = true 
}: PDFViewerProps, ref) =>  {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

    const { currentImage } = useContext(ImageContext);
    const { brushWidth, color: brushColor  } = useContext(EraserContext);
    const { textBoxs, setCurrentPage } = useContext(TextBoxContext);

    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState(1);
    const [rehydrate, setRehydrate] = useState(false);
    const [pageLoaded, setPageLoaded] = useState(false);

    const pdfDataRef = useRef<PDFDocumentProxy>();
    const canvasRef = useRef<HTMLCanvasElement|null>(null);
    const [canvasUrl, setCanvasUrl] = useState<string>();

    let canvasDrawRef = null as any;

    useImperativeHandle(ref, () => ({
        undo: canvasDrawRef?.undo,
        clear: canvasDrawRef?.clear
    }));

    const changePage = (offset: number) => {
        setPageLoaded(false);
        setCurrentPage(pageNumber + offset);
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    const previousPage = () => {
        changePage(-1);
    };

    const nextPage = () =>{
        changePage(1);
    };

    useEffect(() => {

    }, [pageNumber]);

    useEffect(() => {
        if (rehydrate && pageLoaded) {
            setCanvasUrl(canvasRef.current?.toDataURL());
        }
        pdfDataRef.current?.getPage(2).then((res) =>{
            console.log('🚀 ~ file: index.tsx ~ line 65 ~ pdfDataRef.current?.getPage ~ res', res);
        });
    },[pageNumber, canvasRef, rehydrate, pageLoaded]);

    const { canvasHeight, canvasWidth } = useImageSize(canvasUrl ?? '');

    return (
        <div className="pdf-viewer">
            <div className='header-tool'>
                <div className="buttonc">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={previousPage}
                        className="Pre"
                    >
                        <FontAwesomeIcon icon={faCaretLeft}/>
                    </button>
                    <span>{`${pageNumber || (numPages ? 1 : '-')}/${numPages || '-'}`}</span>
                    <button
                        disabled={pageNumber >= (numPages ?? 0)}
                        onClick={nextPage}
                    >
                        <FontAwesomeIcon icon={faCaretRight}/>
                    </button>
                </div>
            </div>
            <div className='pdf-viewer-wrapper'>
                {(!pageLoaded || !rehydrate) && <LoadingFullView />}
                <Document
                    file={currentImage?.url}
                    className='document-pdf-viewer'
                    onLoadSuccess={(pdf) => {
                        pdfDataRef.current = pdf;
                        setNumPages(pdf.numPages);
                        setPageNumber(1);
                    }}
                    onLoadError={e => {
                        notification.error({
                            message: 'Loading Pdf failed'
                        });
                    }}
                >
                    {Array.from(Array(numPages).keys()).map(pageNum => (
                        <Page pageNumber={pageNum} scale={1.5}
                            onRenderSuccess={() => {
                                setPageLoaded(true);
                            }}
                            onRenderError={e => {
                                setPageLoaded(true);
                                setRehydrate(true);
                            }} 
                            canvasRef={canvas => {
                                canvasRef.current = canvas;
                                setRehydrate(true);
                            }}
                        />
                    ))}
                </Document>
                {/* <div className='image-to-edit' ref={imageRef}>
                    <CanvasDraw imgSrc={canvasUrl}
                        canvasHeight={canvasHeight}
                        canvasWidth={canvasWidth}
                        hideGrid
                        ref={canvasDraw => (canvasDrawRef = canvasDraw)}
                        onChange={() => {}}
                        disabled={panel !== 'erase'}
                        brushColor={brushColor}
                        lazyRadius={1}
                        brushRadius={brushWidth}
                    />
                    {Object.values(textBoxs).filter(item => item.page === pageNumber)
                        .map(textBox => (
                            <TextBox 
                                key={textBox.id}
                                data={textBox}
                                draggable={textBoxDraggable}
                            />
                        ))
                    }
                </div> */}
            </div>
        </div>
    );
});