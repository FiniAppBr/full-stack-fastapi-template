import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const ENTITY_TYPE_COLORS = {
  product: 'primary',
  service: 'secondary',
  policy: 'info',
  faq: 'warning',
  custom: 'default',
};

// ----------------------------------------------------------------------

export function EntityListView() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoints.entities.list);
      setEntities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleNewEntity = useCallback(() => {
    navigate(paths.dashboard.entity.new);
  }, [navigate]);

  const handleEdit = useCallback(
    (id) => {
      navigate(paths.dashboard.entity.edit(id));
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (window.confirm('Tem certeza que deseja excluir esta entidade?')) {
        try {
          await axios.delete(endpoints.entities.delete(id));
          fetchEntities();
        } catch (error) {
          console.error('Failed to delete entity:', error);
        }
      }
    },
    [fetchEntities]
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
        <Typography variant="h4">Entidades</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleNewEntity}
        >
          Nova Entidade
        </Button>
      </Stack>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Dados</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : entities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhuma entidade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                entities
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((entity) => (
                    <TableRow key={entity.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{entity.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entity.type}
                          color={ENTITY_TYPE_COLORS[entity.type] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                          {entity.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                          {Object.keys(entity.data || {}).length} campos
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleEdit(entity.id)} size="small">
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(entity.id)} size="small" color="error">
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={entities.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>
    </DashboardContent>
  );
}
