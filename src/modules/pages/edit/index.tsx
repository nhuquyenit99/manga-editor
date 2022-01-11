import React, { useCallback, useContext, useRef, useState } from 'react';
import moment from 'moment';
import CanvasDraw from 'react-canvas-draw';
import { Button, Dropdown, Menu, Tooltip } from 'antd';
import { DownOutlined, ExportOutlined, SaveOutlined, TranslationOutlined } from '@ant-design/icons';
import { toJpeg, toPng, toSvg } from 'html-to-image';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { 
    CropperImagePanel, InsertTextPanel, 
    UploadImageDragger, TextBox, 
    ExportImageModal, EraseMenu, PDFViewer 
} from '../../../components';
import { EraserContext, ImageContext, TextBoxContext } from '../../../context';
import { useImageSize } from '../../../utils';
import { TextBoxData } from '../../../model';
import { EditSideBar } from './side-bar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMousePointer, faSearch } from '@fortawesome/free-solid-svg-icons';
import './style.scss';

type EditAction = 'crop' | 'text' | 'draw' | 'erase';

export const EditPage = () => {
    const { currentImage, setCurrentImage } = useContext(ImageContext);

    let { panel } = useParams<{panel: EditAction}>();
    const history = useHistory();

    const imageRef = useRef<any>();
    const saveModelRef = useRef<any>();

    const [textBoxs, setTextBoxs] = useState<Record<string, TextBoxData>>({});
    const [activeTextBox, setActiveTextBox] = useState<string>('');
    const [brushWidth, setBrushWidth] = useState(10);
    const [brushColor, setBrushColor] = useState('rgba(255,255,255,1)');
    const [disableZoom, setDisableZoom] = useState(true);

    let canvasDrawRef = null as any;

    const removeTextBox = (id: string) => {
        let list = {...textBoxs};
        delete list[id];
        setTextBoxs(list);
        if (activeTextBox === id) {
            setActiveTextBox('');
        }
    };

    const onExport = useCallback(async (fileName: string, extension: '.jpg' | '.png' | '.svg') => {
        let dataUrl;
        switch(extension) {
        case '.jpg': 
            dataUrl = await toJpeg(imageRef.current, { cacheBust: true, });
            break;
        case '.png': 
            dataUrl = await toPng(imageRef.current, { cacheBust: true, });
            break;
        case '.svg': 
            dataUrl = await toSvg(imageRef.current, { cacheBust: true, });
            break;
        }
        const link = document.createElement('a');
        link.download = `${fileName}${extension}`;
        link.href = dataUrl;
        link.click();
        const uploadedList = JSON.parse(localStorage.getItem('uploadedList') ?? '[]');
        localStorage.setItem('uploadedList', JSON.stringify([{
            url: dataUrl,
            original_filename: fileName,
            created_at: moment().toISOString()
        }, ...uploadedList]));
    },[imageRef]);

    const { canvasHeight, canvasWidth } = useImageSize(currentImage?.url ?? '');
    console.log('🚀 ~ file: index.tsx ~ line 76 ~ EditPage ~ currentImage', currentImage);

    if (!panel) {
        return <Redirect to='/edit/text'/>;
    }

    if (!currentImage) {
        return (
            <div className='edit-page-layout'>
                <EditSideBar 
                    action={panel}
                />
                <div className='main-content'>
                    <div className='header'>
                        <div className='title'>Edit Page</div>  
                        <div className='suffix'>
                            <Button shape='round' onClick={() => {
                                setCurrentImage(undefined);
                                history.push('/');
                            }} >Cancel</Button>
                        </div>
                    </div>
                    <div className='upload-image-panel'>
                        <UploadImageDragger />
                    </div>
                </div>
            </div>
        );
    }
    const Panel = EditPanel[panel];

    return (
        <div className='edit-page-layout'>
            <EditSideBar 
                action={panel}
            />
            <div className='main-content'>
                <div className='header'>
                    <div className='title'>Edit Page</div>  
                    <div className='suffix'>
                        {currentImage && 
                        <Dropdown trigger={['click']} overlayClassName='custom-dropdown' overlay={<Menu>
                            <Menu.Item onClick={() => {
                                canvasDrawRef?.resetView?.();
                                saveModelRef.current?.open();
                            }} icon={<ExportOutlined size={16}/>}>
                                Export
                            </Menu.Item>
                            <Menu.Item onClick={() => {
                                canvasDrawRef?.resetView?.();
                                saveModelRef.current?.open();
                            }} icon={<SaveOutlined size={16}/>}>
                                Save
                            </Menu.Item>
                            <Menu.Item onClick={() => {
                                // canvasDrawRef?.resetView?.();
                                history.push('/translate');
                            }} icon={<TranslationOutlined size={16}/>}>
                                Auto-Translate
                            </Menu.Item>
                        </Menu>}>
                            <Button type='primary' shape='round' className='menu-action'>Menu <DownOutlined/></Button>
                        </Dropdown>}
                        <Button shape='round' onClick={() => {
                            setCurrentImage(undefined);
                            history.push('/');
                        }} >Cancel</Button>
                    </div>
                </div>
                <div className='edit-panel-content'>
                    <TextBoxContext.Provider
                        value={{
                            activeId: activeTextBox,
                            setActiveId: setActiveTextBox,
                            removeTextBox: removeTextBox,
                            textBoxs: textBoxs,
                            setTextBoxs: setTextBoxs
                        }}
                    >
                        <EraserContext.Provider value={{
                            color: brushColor,
                            setColor: setBrushColor,
                            brushWidth: brushWidth,
                            setBrushWidth: setBrushWidth,
                            onUndo: () => canvasDrawRef?.undo?.(),
                            onClearAll: () => canvasDrawRef?.clear?.()
                        }}
                        >
                            <Panel />
                            <div className='workspace'>
                                <div className='change-mode-tool'>
                                    {panel === 'erase' && <>
                                        <Tooltip title='Disable Zoom' placement='right'>
                                            <button onClick={() => {
                                                setDisableZoom(true);
                                                canvasDrawRef?.resetView?.();
                                            }}
                                            className={disableZoom ? 'active' : ''}
                                            ><FontAwesomeIcon icon={faMousePointer}/></button>
                                        </Tooltip>
                                        <Tooltip title='Zoom' placement='right'>
                                            <button onClick={() => setDisableZoom(false)}
                                                className={disableZoom ? '' : 'active'}
                                            ><FontAwesomeIcon icon={faSearch}/></button>
                                        </Tooltip>
                                    </>}
                                </div>
                                {/*<TransformWrapper
                                    minScale={0.2}
                                    maxScale={3}
                                    disabled={disableZoom}
                                    ref={zoomRef}
                                >
                                    {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
                                        <div className='image-panel-wrapper'>
                                            <div className='image-wrapper'>
                                                <TransformComponent wrapperClass={disableZoom ? 'disabled-transform' : undefined}>
                                                    
                                                </TransformComponent>
                                            </div>
                                            {!disableZoom && <div className="tools">
                                                <button onClick={() => zoomIn()} title='Zoom In'><FontAwesomeIcon icon={faSearchPlus}/></button>
                                                <button onClick={() => zoomOut()} title='Zoom Out'><FontAwesomeIcon icon={faSearchMinus}/></button>
                                                <button onClick={() => resetTransform()} title='Reset'><FontAwesomeIcon icon={faTimes}/></button>
                                            </div>}
                                        </div>
                                    )}
                                </TransformWrapper> */}
                                {currentImage.type === 'application/pdf' 
                                    ? <PDFViewer url={currentImage.url}
                                        canvasDrawRef={canvasDrawRef}
                                        imageRef={imageRef}
                                        panel={panel}
                                        disableZoom={disableZoom}
                                    />
                                    :<><div className='image-to-edit' ref={imageRef}>
                                        <CanvasDraw imgSrc={currentImage.url ?? ''}
                                            canvasHeight={canvasHeight}
                                            canvasWidth={canvasWidth}
                                            hideGrid
                                            ref={canvasDraw => (canvasDrawRef = canvasDraw)}
                                            onChange={() => {}}
                                            disabled={panel !== 'erase'}
                                            brushColor={brushColor}
                                            lazyRadius={1}
                                            brushRadius={brushWidth}
                                            //@ts-ignore
                                            enablePanAndZoom={!disableZoom}
                                        />
                                        {Object.values(textBoxs).map(textBox => (
                                            <TextBox 
                                                key={textBox.id}
                                                data={textBox}
                                            />
                                        ))}
                                    </div>
                                    {panel === 'erase' && !disableZoom && <div className='tools'>
                                        <button className='btn-reset-view' onClick={() => {
                                            canvasDrawRef?.resetView?.();
                                        }}>Reset View
                                        </button>
                                    </div>
                                    }</>
                                }
                                <ExportImageModal 
                                    onSave={onExport}
                                    ref={saveModelRef}
                                />
                            </div>
                        </EraserContext.Provider>
                    </TextBoxContext.Provider>
                </div>
            </div>
        </div>
    );
};

const EditPanel: Record<EditAction, React.ComponentType> = {
    crop: CropperImagePanel,
    text: InsertTextPanel,
    draw: () => <div style={{color: 'white'}}>Draw Panel</div>,
    erase: EraseMenu
};