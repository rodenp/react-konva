import { useEffect, useRef, useState } from 'react';
import useKonvaApp from './KonvaApp.ts';
import './KonvaShapeEditor.css';

function KonvaShapeEditor(): JSX.Element {
  // Reference to the container div
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use our custom hook to get Konva functionality
  const {
    addRectangle,
    addCircle,
    createGroup,
    ungroup,
    clearAll,
    setUpdateGroupButton,
    selectedIds,
    groups
  } = useKonvaApp('container');
  
  // State to track the group button text
  const [groupButtonText, setGroupButtonText] = useState('Create Group');
  
  // Log when button text changes
  useEffect(() => {
    console.log('Button text updated to:', groupButtonText);
  }, [groupButtonText]);
  
  // Initialize Konva and set up the container
  useEffect(() => {
    if (containerRef.current) {
      // Set the container background color explicitly
      containerRef.current.style.backgroundColor = 'white';
      
      // Set up the update group button callback
      setUpdateGroupButton(() => {
        // Check if we have exactly one group selected
        let newButtonText = 'Create Group';
        
        if (selectedIds.length === 1 && groups.some(g => g.id === selectedIds[0])) {
          // One group selected
          newButtonText = 'Ungroup';
        } else if (selectedIds.length >= 2) {
          // Multiple items selected
          newButtonText = 'Create Group';
        }
        
        // Only update if the text has changed
        if (newButtonText !== groupButtonText) {
          console.log('Updating button text from callback to:', newButtonText);
          setGroupButtonText(newButtonText);
        }
      });
    }
  }, [setUpdateGroupButton, selectedIds, groups, groupButtonText]);
  
  const handleAddRectangle = () => {
    addRectangle();
  };
  
  const handleAddCircle = () => {
    addCircle();
  };
  
  const handleClearAll = () => {
    clearAll();
    setGroupButtonText('Create Group');
  };
  
  const handleGroupButton = () => {
    // Check if we have a selected group
    if (selectedIds.length === 1 && 
        groups.some(g => g.id === selectedIds[0])) {
      ungroup();
      // Immediately update button text
      setGroupButtonText('Create Group');
    } else {
      createGroup();
      // Immediately update button text
      setGroupButtonText('Ungroup');
    }
  };
  
  return (
    <div className="konva-shape-editor">
      <div id="controls">
        <div className="button-group">
          <button id="add-rectangle" className="btn-rect" onClick={handleAddRectangle}>
            Add Rectangle
          </button>
          <button id="add-circle" className="btn-circle" onClick={handleAddCircle}>
            Add Circle
          </button>
          <button id="clear-all" className="btn-clear" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
        <button id="group-button" className="btn-group" onClick={handleGroupButton}>
          {groupButtonText}
        </button>
      </div>
      
      <div id="container" ref={containerRef}></div>
    </div>
  );
}

export default KonvaShapeEditor;