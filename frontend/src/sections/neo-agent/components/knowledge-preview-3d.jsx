import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// Category config with distinct colors and positions (spread across X axis)
const CATEGORIES = [
  { id: 'products', color: '#3B82F6', xOffset: -3 },    // Bright sky blue
  { id: 'business', color: '#9333EA', xOffset: -1 },    // Vivid purple
  { id: 'situations', color: '#F97316', xOffset: 1 },   // Bright orange
  { id: 'guardrails', color: '#DC2626', xOffset: 3 },   // Bright red
];

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
 * Displays floating cubes in 4 separate columns with dividers
 */
export function KnowledgePreview3D({ counts, onClick, onSelectCategory }) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const isEmpty = totalCount === 0;

  const handleSectionClick = (categoryId) => (e) => {
    e.stopPropagation();
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.neutral',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 4-column grid with dividers */}
      <Stack direction="row" sx={{ position: 'relative' }}>
        {LABELS.map((label, index) => {
          const cat = CATEGORIES[index];
          const count = counts[label.id] || 0;
          const hasItems = count > 0;

          return (
            <Box
              key={label.id}
              onClick={handleSectionClick(label.id)}
              sx={{
                flex: 1,
                borderRight: index < 3 ? '1px solid' : 'none',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                  '& .section-canvas': {
                    bgcolor: 'action.hover',
                  },
                },
              }}
            >
              {/* Individual 3D Canvas per column */}
              <Box
                className="section-canvas"
                sx={{
                  height: 120,
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  '& canvas': {
                    width: '100% !important',
                    height: '100% !important',
                  },
                }}
              >
                <Canvas
                  camera={{ position: [0, 0, 4], fov: 45 }}
                  dpr={[1, 2]}
                >
                  <ambientLight intensity={0.6} />
                  <pointLight position={[2, 3, 3]} intensity={1.2} />
                  <pointLight position={[-2, -1, -2]} intensity={0.3} color="#a0a0ff" />
                  {hasItems && <ColumnCubes count={count} color={cat.color} />}
                </Canvas>

                {/* Empty column indicator */}
                {!hasItems && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify
                      icon="eva:plus-outline"
                      width={24}
                      sx={{ color: 'text.disabled', opacity: 0.3 }}
                    />
                  </Box>
                )}
              </Box>

              {/* Label section */}
              <Box
                sx={{
                  py: 1.5,
                  px: 0.5,
                  textAlign: 'center',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <Iconify
                  icon={label.icon}
                  width={22}
                  sx={{
                    color: hasItems ? cat.color : 'text.disabled',
                    mb: 0.25,
                  }}
                />
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: hasItems ? cat.color : 'text.disabled',
                    fontWeight: 700,
                    fontSize: '1rem',
                    lineHeight: 1.2,
                  }}
                >
                  {count}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: hasItems ? 'text.primary' : 'text.disabled',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    display: 'block',
                    lineHeight: 1.3,
                  }}
                >
                  {label.title}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>

      {/* Global empty state overlay */}
      {isEmpty && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)',
            zIndex: 1,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
            <Iconify icon="solar:add-circle-bold-duotone" width={36} sx={{ mb: 0.5, opacity: 0.6 }} />
            <Typography variant="caption" sx={{ display: 'block' }}>
              Clique para adicionar
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

/**
 * Cubes for a single column - centered in their own canvas
 */
function ColumnCubes({ count, color }) {
  const cubesRef = useRef([]);

  const cubeData = useMemo(() => {
    const cubeCount = Math.min(count, 5);
    const data = [];

    for (let i = 0; i < cubeCount; i++) {
      // Spread cubes in a tight vertical cluster
      const spreadX = (Math.random() - 0.5) * 1.2;
      const spreadY = (Math.random() - 0.5) * 1.8;
      const spreadZ = (Math.random() - 0.5) * 0.6;

      data.push({
        id: i,
        position: { x: spreadX, y: spreadY, z: spreadZ },
        rotationSpeed: {
          x: 0.12 + Math.random() * 0.15,
          y: 0.08 + Math.random() * 0.12,
        },
        floatOffset: Math.random() * Math.PI * 2,
        scale: 0.28 + Math.random() * 0.1,
      });
    }

    return data;
  }, [count]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    cubesRef.current.forEach((cube, i) => {
      if (!cube || !cubeData[i]) return;

      const d = cubeData[i];
      cube.rotation.x += delta * d.rotationSpeed.x;
      cube.rotation.y += delta * d.rotationSpeed.y;
      cube.position.y = d.position.y + Math.sin(time * 0.5 + d.floatOffset) * 0.1;
    });
  });

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
            color={color}
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
