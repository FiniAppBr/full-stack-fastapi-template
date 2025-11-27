import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// Category config with distinct colors and positions (spread across X axis)
const CATEGORIES = [
  { id: 'products', color: '#2563EB', xOffset: -3 },    // Bright blue
  { id: 'business', color: '#9333EA', xOffset: -1 },    // Vivid purple
  { id: 'situations', color: '#F97316', xOffset: 1 },   // Bright orange
  { id: 'guardrails', color: '#DC2626', xOffset: 3 },   // Bright red
];

// ----------------------------------------------------------------------

/**
 * 3D Floating Cubes - grouped by category position
 */
function KnowledgeCubes({ counts }) {
  const cubesRef = useRef([]);

  // Generate cube data - cubes grouped above each category label
  const cubeData = useMemo(() => {
    const data = [];

    CATEGORIES.forEach((cat) => {
      const count = counts[cat.id] || 0;
      if (count === 0) return;

      // Limit cubes per category for performance
      const cubeCount = Math.min(count, 6);

      for (let i = 0; i < cubeCount; i++) {
        // Cluster cubes in a small area above their category
        const spreadX = (Math.random() - 0.5) * 1.2;
        const spreadY = Math.random() * 1.5;
        const spreadZ = (Math.random() - 0.5) * 0.8;

        data.push({
          id: `${cat.id}-${i}`,
          color: cat.color,
          position: {
            x: cat.xOffset + spreadX,
            y: spreadY - 0.5,
            z: spreadZ,
          },
          rotationSpeed: {
            x: 0.15 + Math.random() * 0.2,
            y: 0.1 + Math.random() * 0.15,
          },
          floatOffset: Math.random() * Math.PI * 2,
          scale: 0.3 + Math.random() * 0.12,
        });
      }
    });

    return data;
  }, [counts]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    cubesRef.current.forEach((cube, i) => {
      if (!cube || !cubeData[i]) return;

      const d = cubeData[i];

      // Gentle rotation
      cube.rotation.x += delta * d.rotationSpeed.x;
      cube.rotation.y += delta * d.rotationSpeed.y;

      // Floating animation
      cube.position.y = d.position.y + Math.sin(time * 0.6 + d.floatOffset) * 0.12;
    });
  });

  if (cubeData.length === 0) return null;

  return (
    <>
      {cubeData.map((d, i) => (
        <mesh
          key={d.id}
          ref={(el) => { cubesRef.current[i] = el; }}
          position={[d.position.x, d.position.y, d.position.z]}
          scale={d.scale}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={d.color}
            opacity={0.85}
            transparent
            metalness={0.15}
            roughness={0.4}
          />
        </mesh>
      ))}
    </>
  );
}

// ----------------------------------------------------------------------

// Labels config matching CATEGORIES order
const LABELS = [
  { id: 'products', title: 'Produtos', icon: 'solar:box-bold-duotone' },
  { id: 'business', title: 'Informações', icon: 'solar:buildings-2-bold-duotone' },
  { id: 'situations', title: 'Como agir', icon: 'solar:chat-round-dots-bold-duotone' },
  { id: 'guardrails', title: 'Regras', icon: 'solar:shield-warning-bold-duotone' },
];

/**
 * 3D Knowledge Preview Component
 * Displays floating cubes grouped above category labels
 */
export function KnowledgePreview3D({ counts, onClick }) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const isEmpty = totalCount === 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        bgcolor: 'background.neutral',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* 3D Canvas */}
      <Box
        sx={{
          width: '100%',
          height: 140,
          '& canvas': {
            width: '100% !important',
            height: '100% !important',
          },
        }}
      >
        <Canvas
          camera={{ position: [0, 0.5, 8], fov: 40 }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1.5} />
          <pointLight position={[-5, -2, -5]} intensity={0.4} color="#a0a0ff" />
          {!isEmpty && <KnowledgeCubes counts={counts} />}
        </Canvas>
      </Box>

      {/* Empty state overlay */}
      {isEmpty && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <Iconify icon="solar:add-circle-bold-duotone" width={40} sx={{ mb: 1, opacity: 0.5 }} />
            <Typography variant="caption">Clique para adicionar conhecimento</Typography>
          </Box>
        </Box>
      )}

      {/* Category Labels Row */}
      <Stack
        direction="row"
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {LABELS.map((label, index) => {
          const cat = CATEGORIES[index];
          const count = counts[label.id] || 0;
          const hasItems = count > 0;

          return (
            <Box
              key={label.id}
              sx={{
                flex: 1,
                py: 1.5,
                px: 1,
                textAlign: 'center',
                borderRight: index < 3 ? '1px solid' : 'none',
                borderColor: 'divider',
                transition: 'background 0.2s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Iconify
                icon={label.icon}
                width={24}
                sx={{
                  color: hasItems ? cat.color : 'text.disabled',
                  mb: 0.5,
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  color: hasItems ? cat.color : 'text.disabled',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  lineHeight: 1.2,
                }}
              >
                {count}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: hasItems ? 'text.secondary' : 'text.disabled',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                {label.title}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
