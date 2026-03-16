import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

// 仅选取 DataGrid 需要的字段，作为行模型
type TrackRow = Pick<TrackEntity, 'id' | 'title' | 'artist' | 'album' | 'duration'>;

const columns: GridColDef<TrackRow>[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'title', headerName: 'Title', width: 200, editable: false },
  { field: 'artist', headerName: 'Artist', width: 150, editable: false },
  { field: 'album', headerName: 'Album', width: 150, editable: false },
  {
    field: 'duration',
    headerName: 'Duration',
    type: 'number',
    width: 110,
    editable: false,
    // 可选：格式化时长显示（如 213 -> 03:33）
    // valueFormatter: (p) => {
    //   const v = Number(p.value ?? 0);
    //   const mm = Math.floor(v / 60).toString().padStart(2, '0');
    //   const ss = Math.floor(v % 60).toString().padStart(2, '0');
    //   return `${mm}:${ss}`;
    // },
  },
];

type PlaylistDGProps = {
  tracks: TrackEntity[];
};

export default function PlaylistDG({ tracks }: PlaylistDGProps) {
  // 如需映射或裁剪字段，保持 rows 类型稳定
  const rows = React.useMemo<TrackRow[]>(
    () =>
      tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
      })),
    [tracks],
  );

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <DataGrid<TrackRow>
        rows={rows}
        columns={columns}
        checkboxSelection
        disableRowSelectionOnClick
        pageSizeOptions={[5, 10, 25]}
        initialState={{
          pagination: { paginationModel: { pageSize: 99999, page: 0 } },
        }}
      />
    </Box>
  );
}


