/* eslint-disable react/no-unknown-property */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// Category config with colors
const CATEGORIES = [
  { id: 'products', color: '#00BFFF', title: 'Produtos', icon: 'solar:box-bold-duotone' },
  { id: 'business', color: '#9333EA', title: 'Informações', icon: 'solar:buildings-2-bold-duotone' },
  { id: 'situations', color: '#F97316', title: 'Como agir', icon: 'solar:chat-round-dots-bold-duotone' },
  { id: 'guardrails', color: '#DC2626', title: 'Regras', icon: 'solar:shield-warning-bold-duotone' },
];

// ----------------------------------------------------------------------

/**
 * 3D Knowledge Preview Component
 * Displays floating category cards with 3D cubes + documents strip
 */
export function KnowledgePreview3D({ counts, onSelectCategory }) {
  const handleCategoryClick = (categoryId) => (e) => {
    e.stopPropagation();
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    }
  };

  return (
    <Stack direction="row" spacing={1.5}>
      {CATEGORIES.map((cat) => {
        const count = counts[cat.id] || 0;
        const hasItems = count > 0;

        return (
          <Box
            key={cat.id}
            onClick={handleCategoryClick(cat.id)}
            sx={{
              flex: 1,
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: hasItems ? `${cat.color}15` : 'background.neutral',
              border: '1px solid',
              borderColor: hasItems ? `${cat.color}30` : 'divider',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: hasItems ? `${cat.color}25` : 'action.hover',
                transform: 'scale(1.02)',
                borderColor: cat.color,
              },
            }}
          >
            {/* 3D Canvas area */}
            <Box
              sx={{
                height: 80,
                position: 'relative',
                '& canvas': {
                  width: '100% !important',
                  height: '100% !important',
                },
              }}
            >
              <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
                <ambientLight intensity={0.6} />
                <pointLight position={[2, 3, 3]} intensity={1.2} />
                <pointLight position={[-2, -1, -2]} intensity={0.3} color="#a0a0ff" />
                {hasItems && <ColumnCubes count={count} color={cat.color} />}
              </Canvas>

              {/* Empty state */}
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
                    width={20}
                    sx={{ color: 'text.disabled', opacity: 0.4 }}
                  />
                </Box>
              )}
            </Box>

            {/* Label area */}
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: hasItems ? `${cat.color}25` : 'action.hover',
                  mx: 'auto',
                  mb: 0.75,
                }}
              >
                <Iconify
                  icon={cat.icon}
                  width={20}
                  sx={{ color: hasItems ? cat.color : 'text.disabled' }}
                />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  color: hasItems ? cat.color : 'text.disabled',
                  fontWeight: 700,
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
                  display: 'block',
                }}
              >
                {cat.title}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

// ----------------------------------------------------------------------

/**
 * Cubes for a single column - size scales inversely with count
 */
function ColumnCubes({ count, color }) {
  const cubesRef = useRef([]);

  const cubeData = useMemo(() => {
    const cubeCount = Math.min(count, 6);
    const data = [];

    // Scale based on count: 1 cube = large, many cubes = smaller
    const scaleMap = {
      1: { base: 0.7, variance: 0, spread: 0 },
      2: { base: 0.45, variance: 0.05, spread: 1.2 },
      3: { base: 0.38, variance: 0.05, spread: 1.6 },
      4: { base: 0.32, variance: 0.05, spread: 1.9 },
      5: { base: 0.28, variance: 0.05, spread: 2.1 },
      6: { base: 0.25, variance: 0.05, spread: 2.3 },
    };
    const config = scaleMap[cubeCount] || scaleMap[6];

    for (let i = 0; i < cubeCount; i += 1) {
      const spreadX = (Math.random() - 0.5) * config.spread;
      const spreadY = (Math.random() - 0.5) * config.spread * 1.2;
      const spreadZ = (Math.random() - 0.5) * config.spread * 0.5;

      data.push({
        id: i,
        position: { x: spreadX, y: spreadY, z: spreadZ },
        rotationSpeed: {
          x: 0.12 + Math.random() * 0.15,
          y: 0.08 + Math.random() * 0.12,
        },
        floatOffset: Math.random() * Math.PI * 2,
        scale: config.base + Math.random() * config.variance,
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
            opacity={0.9}
            transparent
            metalness={0.1}
            roughness={0.3}
            emissive={color}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </>
  );
}
