// KonvaApp.ts - Functional Konva implementation
import Konva from 'konva';
import { useEffect, useRef, useState, useCallback } from 'react';

// Define types for shapes and groups
interface ShapeData {
  id: string;
  node: Konva.Shape;
  group: Konva.Group;
  type: 'rectangle' | 'circle';
  groupId: string | null;
}

interface GroupData {
  id: string;
  node: Konva.Group;
  backgroundNode: Konva.Rect;
}

interface Point {
  x: number;
  y: number;
}

interface KonvaAppHooks {
  addRectangle: () => void;
  addCircle: () => void;
  createGroup: () => void;
  ungroup: () => void;
  clearAll: () => void;
  setUpdateGroupButton: (callback: () => void) => void;
  selectedIds: string[];
  shapes: ShapeData[];
  groups: GroupData[];
}

const useKonvaApp = (containerId: string): KonvaAppHooks => {
  // State for shapes, groups, and selection
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Refs for Konva objects
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const selectionTransformerRef = useRef<Konva.Transformer | null>(null);
  const hoverTransformerRef = useRef<Konva.Transformer | null>(null);
  const updateGroupButtonRef = useRef<(() => void) | null>(null);
  
  // Colors for shapes
  const colors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'cyan', 'magenta'];
  
  // Initialize Konva stage and layer
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Create stage
    const stage = new Konva.Stage({
      container: containerId,
      width: window.innerWidth,
      height: window.innerHeight - 50 // Adjust for controls
    });
    
    // Create layer
    const layer = new Konva.Layer();
    stage.add(layer);
    
    // Create selection transformer
    const selectionTransformer = new Konva.Transformer({
      boundBoxFunc: (oldBox, newBox) => {
        // Limit minimum size
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      },
      anchorStroke: '#0066ff',
      anchorFill: '#ffffff',
      anchorSize: 6,
      borderStroke: 'rgba(0,161,255,1)',
      borderStrokeWidth: 4,
      borderDash: [],
      rotateAnchorOffset: 30
    });
    
    // Create hover transformer
    const hoverTransformer = new Konva.Transformer({
      rotateEnabled: false,
      resizeEnabled: false,
      anchorSize: 0,
      borderStroke: 'rgba(0,161,255,0.7)',
      borderDash: [5, 5],
      borderStrokeWidth: 4,
      rotateAnchorOffset: 0,
      enabledAnchors: []
    });
    
    // Add transformers to layer
    layer.add(selectionTransformer);
    layer.add(hoverTransformer);
    
    // Store refs
    stageRef.current = stage;
    layerRef.current = layer;
    selectionTransformerRef.current = selectionTransformer;
    hoverTransformerRef.current = hoverTransformer;
    
    // Add stage click handler
    stage.on('click', (e) => {
      if (e.target === stage) {
        setSelectedIds([]);
        
        // Call update group button callback
        if (updateGroupButtonRef.current) {
          updateGroupButtonRef.current();
        }
      }
    });
    
    // Handle window resize
    const handleResize = () => {
      if (stage) {
        stage.width(window.innerWidth);
        stage.height(window.innerHeight - 50);
        layer.draw();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial draw
    layer.draw();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      stage.destroy();
    };
  }, [containerId]);
  
  // Update transformers when selection or hover changes
  useEffect(() => {
    if (!selectionTransformerRef.current || !hoverTransformerRef.current || !layerRef.current) return;
    
    // Update selection transformer
    if (selectedIds.length > 0) {
      const nodes = selectedIds.map(id => {
        const shape = shapes.find(s => s.id === id);
        if (shape) return shape.node;
        
        const group = groups.find(g => g.id === id);
        return group ? group.node : null;
      }).filter((node): node is Konva.Shape | Konva.Group => node !== null);
      
      // Check if any selected shape is in a group
      const isAnySelectedInGroup = selectedIds.some(id => {
        const shape = shapes.find(s => s.id === id);
        return shape && shape.groupId !== null;
      });
      
      // Configure transformer based on whether selected items are in groups
      if (isAnySelectedInGroup) {
        selectionTransformerRef.current.rotateEnabled(false);
        selectionTransformerRef.current.resizeEnabled(false);
        selectionTransformerRef.current.anchorSize(0);
        selectionTransformerRef.current.borderStroke('rgba(0,161,255,0.7)');
        selectionTransformerRef.current.borderDash([5, 5]);
        selectionTransformerRef.current.borderStrokeWidth(4);
        selectionTransformerRef.current.rotateAnchorOffset(0);
        selectionTransformerRef.current.enabledAnchors([]);
      } else {
        selectionTransformerRef.current.rotateEnabled(true);
        selectionTransformerRef.current.resizeEnabled(true);
        selectionTransformerRef.current.anchorSize(6);
        selectionTransformerRef.current.borderStroke('rgba(0,161,255,1)');
        selectionTransformerRef.current.borderDash([]);
        selectionTransformerRef.current.borderStrokeWidth(4);
        selectionTransformerRef.current.rotateAnchorOffset(30);
        selectionTransformerRef.current.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
      }
      
      // Cast to Node[] since the transformer accepts Node[] but our filtered array is more specific
      selectionTransformerRef.current.nodes(nodes as Konva.Node[]);
    } else {
      selectionTransformerRef.current.nodes([]);
    }
    
    // Update hover transformer
    if (hoveredId && !selectedIds.includes(hoveredId)) {
      const shape = shapes.find(s => s.id === hoveredId);
      if (shape) {
        hoverTransformerRef.current.nodes([shape.node as Konva.Node]);
      } else {
        const group = groups.find(g => g.id === hoveredId);
        if (group) {
          hoverTransformerRef.current.nodes([group.node as Konva.Node]);
        }
      }
    } else {
      hoverTransformerRef.current.nodes([]);
    }
    
    layerRef.current.draw();
    
    // Call update group button callback
    if (updateGroupButtonRef.current) {
      updateGroupButtonRef.current();
    }
  }, [selectedIds, hoveredId, shapes, groups]);
  
  // Handle shape click
  const handleShapeClick = useCallback((id: string, isShiftKey: boolean) => {
    // Check if the clicked shape is part of a group
    const shape = shapes.find(s => s.id === id);
    
    if (shape && shape.groupId) {
      // If a shape in a group is clicked, select the group instead
      if (!isShiftKey) {
        setSelectedIds([shape.groupId]);
      } else {
        // With shift key, toggle the group in multi-select
        setSelectedIds(prev => {
          if (prev.includes(shape.groupId!)) {
            return prev.filter(selectedId => selectedId !== shape.groupId);
          } else {
            return [...prev, shape.groupId!];
          }
        });
      }
    } else {
      // Normal selection for non-grouped shapes or groups
      if (isShiftKey) {
        // Multi-select
        setSelectedIds(prev => {
          if (prev.includes(id)) {
            return prev.filter(selectedId => selectedId !== id);
          } else {
            return [...prev, id];
          }
        });
      } else {
        // Single select
        setSelectedIds([id]);
      }
    }
  }, [shapes]);
  
  // Add a rectangle
  const addRectangle = useCallback(() => {
    if (!layerRef.current) return;
    
    const id = `rect-${Date.now()}`;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const rect = new Konva.Rect({
      id: id,
      x: Math.random() * (stageRef.current?.width() || 500 - 100),
      y: Math.random() * (stageRef.current?.height() || 500 - 100),
      width: 100,
      height: 50,
      fill: randomColor,
      draggable: true
    });
    
    // Add event handlers
    rect.on('click', (e) => {
      e.cancelBubble = true;
      handleShapeClick(id, e.evt.shiftKey);
    });
    
    rect.on('mouseenter', () => {
      setHoveredId(id);
    });
    
    rect.on('mouseleave', () => {
      setHoveredId(null);
    });
    
    rect.on('transformend', () => {
      // Reset scale and adjust width/height
      rect.width(rect.width() * rect.scaleX());
      rect.height(rect.height() * rect.scaleY());
      rect.scaleX(1);
      rect.scaleY(1);
      
      layerRef.current?.draw();
    });
    
    // Create a group for the shape
    const group = new Konva.Group();
    group.add(rect);
    
    // Add to layer
    layerRef.current.add(group);
    layerRef.current.draw();
    
    // Store shape data
    setShapes(prev => [...prev, {
      id: id,
      node: rect,
      group: group,
      type: 'rectangle',
      groupId: null
    }]);
  }, [colors, handleShapeClick]);
  
  // Add a circle
  const addCircle = useCallback(() => {
    if (!layerRef.current) return;
    
    const id = `circle-${Date.now()}`;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const circle = new Konva.Circle({
      id: id,
      x: Math.random() * (stageRef.current?.width() || 500 - 100),
      y: Math.random() * (stageRef.current?.height() || 500 - 100),
      radius: 50,
      fill: randomColor,
      draggable: true
    });
    
    // Add event handlers
    circle.on('click', (e) => {
      e.cancelBubble = true;
      handleShapeClick(id, e.evt.shiftKey);
    });
    
    circle.on('mouseenter', () => {
      setHoveredId(id);
    });
    
    circle.on('mouseleave', () => {
      setHoveredId(null);
    });
    
    circle.on('transformend', () => {
      // Reset scale and adjust radius
      const avgScale = (circle.scaleX() + circle.scaleY()) / 2;
      circle.radius(circle.radius() * avgScale);
      circle.scaleX(1);
      circle.scaleY(1);
      
      layerRef.current?.draw();
    });
    
    // Create a group for the shape
    const group = new Konva.Group();
    group.add(circle);
    
    // Add to layer
    layerRef.current.add(group);
    layerRef.current.draw();
    
    // Store shape data
    setShapes(prev => [...prev, {
      id: id,
      node: circle,
      group: group,
      type: 'circle',
      groupId: null
    }]);
  }, [colors, handleShapeClick]);
  
  // Helper method to update a group's bounding box
  const updateGroupBoundingBox = useCallback((group: GroupData, groupShapes: ShapeData[]) => {
    if (!layerRef.current) return;
    
    // Create an array to store all corner points of shapes
    let points: Point[] = [];
    
    // Collect all corner/boundary points from all shapes
    groupShapes.forEach(shape => {
      const node = shape.node;
      const pos = node.position();
      
      if (shape.type === 'rectangle') {
        const rect = node as Konva.Rect;
        const width = rect.width();
        const height = rect.height();
        const padding = 10; // Extra padding
        
        // Add the four corners of the rectangle with padding
        points.push({
          x: pos.x - width/2 - padding,
          y: pos.y - height/2 - padding
        });
        points.push({
          x: pos.x + width/2 + padding,
          y: pos.y - height/2 - padding
        });
        points.push({
          x: pos.x - width/2 - padding,
          y: pos.y + height/2 + padding
        });
        points.push({
          x: pos.x + width/2 + padding,
          y: pos.y + height/2 + padding
        });
      } else if (shape.type === 'circle') {
        const circle = node as Konva.Circle;
        const radius = circle.radius();
        const padding = 10; // Extra padding
        
        // For circles, add points at cardinal directions
        const totalRadius = radius + padding;
        points.push({
          x: pos.x - totalRadius,
          y: pos.y
        });
        points.push({
          x: pos.x + totalRadius,
          y: pos.y
        });
        points.push({
          x: pos.x,
          y: pos.y - totalRadius
        });
        points.push({
          x: pos.x,
          y: pos.y + totalRadius
        });
        
        // Also add diagonal points for better coverage
        const diagonalDist = totalRadius * 0.7071; // sqrt(2)/2
        points.push({
          x: pos.x - diagonalDist,
          y: pos.y - diagonalDist
        });
        points.push({
          x: pos.x + diagonalDist,
          y: pos.y - diagonalDist
        });
        points.push({
          x: pos.x - diagonalDist,
          y: pos.y + diagonalDist
        });
        points.push({
          x: pos.x + diagonalDist,
          y: pos.y + diagonalDist
        });
      }
    });
    
    // Find the bounding box of all points
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    
    points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    
    // Update background size
    const width = maxX - minX;
    const height = maxY - minY;
    group.backgroundNode.width(width);
    group.backgroundNode.height(height);
    group.backgroundNode.position({
      x: minX,
      y: minY
    });
    
    // Make the background completely transparent
    group.backgroundNode.fill('transparent');
    group.backgroundNode.stroke('transparent');
    group.backgroundNode.strokeWidth(0);
    
    layerRef.current.draw();
  }, []);
  
  // Helper method to add shapes to a group
  const addShapesToGroup = useCallback((targetGroup: GroupData, shapesToAdd: ShapeData[]) => {
    if (!layerRef.current) return;
    
    // Create a new array for updated shapes
    const updatedShapes = [...shapes];
    
    shapesToAdd.forEach(shape => {
      // If shape is in another group, remove it first
      if (shape.groupId) {
        const oldGroup = groups.find(g => g.id === shape.groupId);
        if (oldGroup) {
          // Update the old group's shapes
          const groupShapes = shapes.filter(s => s.groupId === oldGroup.id);
          if (groupShapes.length <= 2) {
            // If only 1 shape will remain, ungroup it
            const groupToUngroup = oldGroup;
            const shapesToUngroup = updatedShapes.filter(s => s.groupId === groupToUngroup.id);
            
            // Store their global positions
            shapesToUngroup.forEach(s => {
              const globalPos = s.node.getAbsolutePosition();
              const globalRotation = s.node.getAbsoluteRotation();
              
              // Remove from group
              s.group.remove();
              
              // Add directly to layer
              layerRef.current?.add(s.group);
              
              // Set absolute position
              s.node.position(globalPos);
              s.node.rotation(globalRotation);
              
              // Enable dragging again
              s.node.draggable(true);
              
              // Update shape data
              s.groupId = null;
            });
            
            // Remove the group
            groupToUngroup.node.destroy();
            setGroups(prev => prev.filter(g => g.id !== groupToUngroup.id));
          }
        }
      }
      
      // Store the global position and rotation
      const globalPos = shape.node.getAbsolutePosition();
      const globalRotation = shape.node.getAbsoluteRotation();
      
      // Get the target group's global transform
      const groupPos = targetGroup.node.getAbsolutePosition();
      const groupRotation = targetGroup.node.getAbsoluteRotation() * Math.PI / 180;
      
      // Calculate the position difference
      let dx = globalPos.x - groupPos.x;
      let dy = globalPos.y - groupPos.y;
      
      // If the group is rotated, we need to apply inverse rotation to the position difference
      if (groupRotation !== 0) {
        const cos = Math.cos(-groupRotation);
        const sin = Math.sin(-groupRotation);
        const rotatedDx = dx * cos - dy * sin;
        const rotatedDy = dx * sin + dy * cos;
        dx = rotatedDx;
        dy = rotatedDy;
      }
      
      // Remove from current parent
      shape.group.remove();
      
      // Add to target group
      targetGroup.node.add(shape.group);
      
      // Set the new position within the group
      shape.node.position({
        x: dx,
        y: dy
      });
      
      // Set rotation relative to the group
      shape.node.rotation(globalRotation - targetGroup.node.getAbsoluteRotation());
      
      // Disable dragging on individual shapes
      shape.node.draggable(false);
      
      // Update shape data
      const shapeIndex = updatedShapes.findIndex(s => s.id === shape.id);
      if (shapeIndex !== -1) {
        updatedShapes[shapeIndex] = {
          ...updatedShapes[shapeIndex],
          groupId: targetGroup.id
        };
      }
    });
    
    // Update shapes state
    setShapes(updatedShapes);
    
    // Recalculate the group's bounding box
    const groupShapes = updatedShapes.filter(shape => shape.groupId === targetGroup.id);
    updateGroupBoundingBox(targetGroup, groupShapes);
    
    // Redraw the layer
    layerRef.current.draw();
  }, [shapes, groups, updateGroupBoundingBox]);
  
  // Create a group from selected shapes
  const createGroup = useCallback(() => {
    console.log('Creating group...');
    if (!layerRef.current) return;
    
    // Get all selected shapes and groups
    const selectedGroups = selectedIds
      .map(id => groups.find(g => g.id === id))
      .filter((group): group is GroupData => group !== undefined);
    
    const selectedShapes = shapes.filter(shape => 
      selectedIds.includes(shape.id) || 
      (shape.groupId && selectedIds.includes(shape.groupId))
    );
    
    // Check if we have enough shapes to create a group
    if (selectedIds.length < 2) {
      alert('Please select at least 2 shapes to group');
      return;
    }
    
    // Check if we're adding to an existing group
    if (selectedGroups.length === 1 && selectedShapes.some(shape => !shape.groupId || shape.groupId !== selectedGroups[0].id)) {
      // Add shapes to the existing group
      const targetGroup = selectedGroups[0];
      const shapesToAdd = selectedShapes.filter(shape => !shape.groupId || shape.groupId !== targetGroup.id);
      
      if (shapesToAdd.length === 0) {
        alert('All selected shapes are already in this group');
        return;
      }
      
      addShapesToGroup(targetGroup, shapesToAdd);
      
      // Select the group after adding shapes to it
      setSelectedIds([targetGroup.id]);
      
      // Call update group button callback
      if (updateGroupButtonRef.current) {
        console.log('Calling updateGroupButton after adding to group');
        updateGroupButtonRef.current();
      }
      
      return;
    }
    
    // If there's exactly one group selected along with other shapes, add to that group
    if (selectedGroups.length === 1 && selectedShapes.length > 0) {
      const targetGroup = selectedGroups[0];
      const shapesToAdd = selectedShapes.filter(shape => !shape.groupId || shape.groupId !== targetGroup.id);
      
      if (shapesToAdd.length === 0) {
        alert('All selected shapes are already in this group');
        return;
      }
      
      addShapesToGroup(targetGroup, shapesToAdd);
      
      // Select the group after adding shapes to it
      setSelectedIds([targetGroup.id]);
      
      // Call update group button callback
      if (updateGroupButtonRef.current) {
        console.log('Calling updateGroupButton after adding to group');
        updateGroupButtonRef.current();
      }
      
      return;
    }
    
    // Create a new group
    const groupId = `group-${Date.now()}`;
    
    // Find the selected shapes (excluding those in groups)
    const shapesToGroup = shapes.filter(shape => 
      selectedIds.includes(shape.id) && !shape.groupId
    );
    
    if (shapesToGroup.length < 2) {
      alert('Please select at least 2 ungrouped shapes to create a new group');
      return;
    }
    
    // Calculate the group's position (average of all shapes)
    const avgX = shapesToGroup.reduce((sum, shape) => sum + shape.node.x(), 0) / shapesToGroup.length;
    const avgY = shapesToGroup.reduce((sum, shape) => sum + shape.node.y(), 0) / shapesToGroup.length;
    
    // Create the Konva group
    const konvaGroup = new Konva.Group({
      id: groupId,
      x: avgX,
      y: avgY,
      draggable: true
    });
    
    // Add group background (completely transparent)
    const groupBackground = new Konva.Rect({
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      listening: true
    });
    konvaGroup.add(groupBackground);
    
    // Add event handlers to the group
    konvaGroup.on('click', (e) => {
      e.cancelBubble = true;
      handleShapeClick(groupId, e.evt.shiftKey);
    });
    
    // Add event handlers specifically to the background
    groupBackground.on('click', (e) => {
      e.cancelBubble = true;
      handleShapeClick(groupId, e.evt.shiftKey);
    });
    
    // Add hover handlers to the group
    konvaGroup.on('mouseenter', () => {
      setHoveredId(groupId);
    });
    
    konvaGroup.on('mouseleave', () => {
      setHoveredId(null);
    });
    
    // Add hover handlers to the background
    groupBackground.on('mouseenter', () => {
      setHoveredId(groupId);
    });
    
    groupBackground.on('mouseleave', () => {
      setHoveredId(null);
    });
    
    // Create a new array for updated shapes
    const updatedShapes = [...shapes];
    
    // Move shapes to the group
    shapesToGroup.forEach(shape => {
      // Get absolute position before moving to group
      const absPos = shape.node.getAbsolutePosition();
      
      // Remove from current parent
      shape.group.remove();
      
      // Add to group
      konvaGroup.add(shape.group);
      
      // Calculate relative position to the group
      const relPos = {
        x: absPos.x - avgX,
        y: absPos.y - avgY
      };
      
      // Set new position
      shape.node.position(relPos);
      
      // Disable dragging on individual shapes
      shape.node.draggable(false);
      
      // Update shape data
      const shapeIndex = updatedShapes.findIndex(s => s.id === shape.id);
      if (shapeIndex !== -1) {
        updatedShapes[shapeIndex] = {
          ...updatedShapes[shapeIndex],
          groupId: groupId
        };
      }
    });
    
    // Update shapes state
    setShapes(updatedShapes);
    
    // Calculate group bounds for background
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    
    shapesToGroup.forEach(shape => {
      const node = shape.node;
      const pos = node.position();
      
      if (shape.type === 'rectangle') {
        const rect = node as Konva.Rect;
        const width = rect.width();
        const height = rect.height();
        
        minX = Math.min(minX, pos.x - width/2 - 10);
        minY = Math.min(minY, pos.y - height/2 - 10);
        maxX = Math.max(maxX, pos.x + width/2 + 10);
        maxY = Math.max(maxY, pos.y + height/2 + 10);
      } else if (shape.type === 'circle') {
        const circle = node as Konva.Circle;
        const radius = circle.radius();
        
        minX = Math.min(minX, pos.x - radius - 10);
        minY = Math.min(minY, pos.y - radius - 10);
        maxX = Math.max(maxX, pos.x + radius + 10);
        maxY = Math.max(maxY, pos.y + radius + 10);
      }
    });
    
    // Set background size
    const width = maxX - minX;
    const height = maxY - minY;
    groupBackground.width(width);
    groupBackground.height(height);
    groupBackground.position({
      x: minX,
      y: minY
    });
    
    // Add group to layer
    layerRef.current.add(konvaGroup);
    
    // Store group data
    const newGroup: GroupData = {
      id: groupId,
      node: konvaGroup,
      backgroundNode: groupBackground
    };
    
    setGroups(prev => [...prev, newGroup]);
    
    // Select the newly created group
    setSelectedIds([groupId]);
    
    layerRef.current.draw();
    
    // Call update group button callback
    if (updateGroupButtonRef.current) {
      console.log('Calling updateGroupButton after creating group');
      updateGroupButtonRef.current();
    }
  }, [shapes, groups, selectedIds, handleShapeClick, addShapesToGroup, updateGroupBoundingBox]);
  
  // Ungroup selected group
  const ungroup = useCallback(() => {
    console.log('Ungrouping...');
    if (!layerRef.current) return;
    
    // Check if we have exactly one group selected
    if (selectedIds.length !== 1) {
      alert('Please select one group to ungroup');
      return;
    }
    
    const groupId = selectedIds[0];
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      alert('Selected item is not a group');
      return;
    }
    
    // Get shapes in this group
    const groupShapes = shapes.filter(shape => shape.groupId === groupId);
    
    // Create a new array for updated shapes
    const updatedShapes = [...shapes];
    
    // For each shape in the group
    const ungroupedShapeIds: string[] = [];
    groupShapes.forEach(shape => {
      // Get absolute position before removing from group
      const absPos = shape.node.getAbsolutePosition();
      const absRotation = shape.node.rotation() + group.node.rotation();
      
      // Remove from group
      shape.group.remove();
      
      // Add back to main layer
      layerRef.current?.add(shape.group);
      
      // Set absolute position
      shape.node.position(absPos);
      shape.node.rotation(absRotation);
      
      // Enable dragging again
      shape.node.draggable(true);
      
      // Update shape data
      const shapeIndex = updatedShapes.findIndex(s => s.id === shape.id);
      if (shapeIndex !== -1) {
        updatedShapes[shapeIndex] = {
          ...updatedShapes[shapeIndex],
          groupId: null
        };
      }
      
      // Store the shape ID for selection
      ungroupedShapeIds.push(shape.id);
    });
    
    // Update shapes state
    setShapes(updatedShapes);
    
    // Remove the original group
    group.node.destroy();
    setGroups(prev => prev.filter(g => g.id !== groupId));
    
    // Select all the ungrouped shapes
    setSelectedIds(ungroupedShapeIds);
    
    // Draw the layer
    layerRef.current.draw();
    
    // Call update group button callback
    if (updateGroupButtonRef.current) {
      console.log('Calling updateGroupButton after ungrouping');
      updateGroupButtonRef.current();
    }
  }, [shapes, groups, selectedIds]);
  
  // Clear all shapes and groups
  const clearAll = useCallback(() => {
    if (!layerRef.current) return;
    
    // Remove all shapes and groups
    shapes.forEach(shape => {
      shape.group.destroy();
    });
    
    groups.forEach(group => {
      group.node.destroy();
    });
    
    setShapes([]);
    setGroups([]);
    setSelectedIds([]);
    setHoveredId(null);
    
    // Clear transformers
    if (selectionTransformerRef.current) {
      selectionTransformerRef.current.nodes([]);
    }
    
    if (hoverTransformerRef.current) {
      hoverTransformerRef.current.nodes([]);
    }
    
    layerRef.current.draw();
  }, [shapes, groups]);
  
  // Set the update group button callback
  const setUpdateGroupButton = useCallback((callback: () => void) => {
    updateGroupButtonRef.current = callback;
  }, []);
  
  // Return the public API
  return {
    addRectangle,
    addCircle,
    createGroup,
    ungroup,
    clearAll,
    setUpdateGroupButton,
    selectedIds,
    shapes,
    groups
  };
};

export default useKonvaApp;