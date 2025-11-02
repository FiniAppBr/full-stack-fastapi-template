import PropTypes from 'prop-types';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * 3D Floating Cubes representing knowledge blocks
 */
function KnowledgeCubes({ count }) {
  const cubes = useRef([]);
  const initialPositions = useRef([]);

  // Initialize positions only once in a spherical distribution
  if (initialPositions.current.length === 0) {
    initialPositions.current = Array.from({ length: count }).map((_, i) => {
      // Use spherical coordinates for even distribution
      const theta = Math.random() * Math.PI * 2; // Horizontal angle
      const phi = Math.acos(2 * Math.random() - 1); // Vertical angle (ensures even distribution)
      const radius = 1.5 + Math.random() * 1.5; // Distance from center

      return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        rotationSpeed: { x: 0.3 + i * 0.05, y: 0.2 + i * 0.03 },
        floatOffset: i * 0.5,
      };
    });
  }

  useFrame((state, delta) => {
    // Use delta for frame-independent animation
    cubes.current.forEach((cube, i) => {
      if (cube) {
        const pos = initialPositions.current[i];

        // Smooth rotation using delta time
        cube.rotation.x += delta * pos.rotationSpeed.x;
        cube.rotation.y += delta * pos.rotationSpeed.y;

        // Gentle floating animation
        const time = state.clock.getElapsedTime();
        cube.position.x = pos.x;
        cube.position.y = pos.y + Math.sin(time * 0.5 + pos.floatOffset) * 0.2;
        cube.position.z = pos.z;
      }
    });
  });

  const colors = ['#2196f3', '#1976d2', '#1565c0', '#0d47a1', '#42a5f5', '#1e88e5', '#1976d2', '#0277bd'];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const pos = initialPositions.current[i] || { x: 0, y: 0, z: 0 };

        return (
          <mesh
            key={i}
            ref={(el) => (cubes.current[i] = el)}
            position={[pos.x, pos.y, pos.z]}
          >
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial
              color={colors[i % colors.length]}
              opacity={0.75}
              transparent
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        );
      })}
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={2} />
      <pointLight position={[-4, -2, -4]} intensity={0.8} color="#64b5f6" />
    </>
  );
}

KnowledgeCubes.propTypes = {
  count: PropTypes.number.isRequired,
};

/**
 * Knowledge Visualization Config Node
 * 3D representation of knowledge blocks, embeddings, and tags
 */
export function KnowledgeVisualizationNode({ data }) {
  const blockCount = data?.blockCount || 0;
  const tags = data?.tags || [];
  const chunks = data?.chunks || 0;

  return (
    <BaseNode
      id={data.id}
      type="knowledge_viz"
      icon="mdi:cube-outline"
      title="Base de Conhecimento"
      tooltip="Visualização 3D dos blocos de conhecimento"
      badge={blockCount}
      editable={false}
      targetHandle={false}
      sourceHandle={false}
      leftHandle={true}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* 3D Canvas */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 200,
            bgcolor: 'background.neutral',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            '& > div': {
              width: '100% !important',
              height: '100% !important',
            },
            '& canvas': {
              width: '100% !important',
              height: '100% !important',
            },
          }}
        >
          <Canvas
            camera={{ position: [0, 0, 8], fov: 50 }}
            dpr={[1, 2]}
          >
            <KnowledgeCubes count={blockCount || 18} />
          </Canvas>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {blockCount} blocos
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {chunks} chunks
          </Typography>
        </Box>

        {/* Tags */}
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {tags.slice(0, 3).map((tag, i) => (
              <Box
                key={i}
                sx={{
                  px: 0.75,
                  py: 0.25,
                  bgcolor: 'primary.lighter',
                  borderRadius: 0.5,
                  fontSize: '0.65rem',
                  color: 'primary.dark',
                }}
              >
                {tag}
              </Box>
            ))}
            {tags.length > 3 && (
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
                +{tags.length - 3}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </BaseNode>
  );
}

KnowledgeVisualizationNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    blockCount: PropTypes.number,
    chunks: PropTypes.number,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
