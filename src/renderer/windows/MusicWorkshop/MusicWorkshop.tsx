import React, { useState, useCallback } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Button, TextField } from '@mui/material';
import './MusicWorkshop.css';

// Since I don't know if react-dropzone is installed, I'll use native drag and drop for now to be safe.
// Or I can check package.json again. I didn't see it in the first 50 lines or the rest.
// Let's use native HTML5 drag and drop.

interface MusicMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string[];
  filePath: string;
}

const MusicWorkshop: React.FC = () => {
  const [files, setFiles] = useState<MusicMetadata[]>([]);
  const [selectedFile, setSelectedFile] = useState<MusicMetadata | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    const musicFiles = droppedFiles.filter(f => f.type.startsWith('audio/') || f.name.endsWith('.mp3') || f.name.endsWith('.flac'));

    // Process files one by one to get metadata
    musicFiles.forEach(async (f) => {
      // Electron exposes path on File object in renderer when contextIsolation is false or via specific handling.
      // However, with contextIsolation: true, 'path' property might be missing on File object in standard web API,
      // but Electron usually patches it.
      // If 'path' is missing, we might need to use Utils.webUtils.getPathForFile(file) in newer Electron versions.
      // Assuming 'path' is available for now as it's common in Electron apps.
      const filePath = (f as any).path;
      if (filePath) {
        try {
          const metadata = await window.mainApi.musicWorkshopApi.readMetadata(filePath);
          setFiles(prev => [...prev, {
            filePath,
            title: metadata.title || f.name,
            artist: metadata.artist,
            album: metadata.album,
            year: metadata.year,
            genre: metadata.genre
          }]);
        } catch (e) {
          console.error("Error reading metadata", e);
          setFiles(prev => [...prev, { filePath, title: f.name }]);
        }
      }
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = async () => {
      const filePaths = await window.mainApi.musicWorkshopApi.selectFile();
      if (filePaths && filePaths.length > 0) {
        filePaths.forEach(async (filePath) => {
           try {
            const metadata = await window.mainApi.musicWorkshopApi.readMetadata(filePath);
            setFiles(prev => [...prev, {
              filePath,
              title: metadata.title || filePath.split('/').pop(),
              artist: metadata.artist,
              album: metadata.album,
              year: metadata.year,
              genre: metadata.genre
            }]);
          } catch (e) {
            console.error("Error reading metadata", e);
            setFiles(prev => [...prev, { filePath, title: filePath.split('/').pop() }]);
          }
        });
      }
  };

  const handleSave = async () => {
    if (selectedFile) {
       await window.mainApi.musicWorkshopApi.writeMetadata(selectedFile.filePath, selectedFile);
       alert("Metadata saved (mock)");
    }
  };

  return (
    <Box 
      sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5">Music Workshop</Typography>
        <Button variant="contained" onClick={handleFileSelect} sx={{ mt: 1 }}>Select Files</Button>
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ width: '33.33%', borderRight: 1, borderColor: 'divider', overflowY: 'auto', height: '100%' }}>
          <List>
            {files.map((file, index) => (
              <ListItem 
                key={index} 
                disablePadding
              >
                <ListItemButton
                  selected={selectedFile === file}
                  onClick={() => setSelectedFile(file)}
                >
                  <ListItemText primary={file.title || file.filePath} secondary={file.artist || 'Unknown Artist'} />
                </ListItemButton>
              </ListItem>
            ))}
            {files.length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                Drag & Drop music files here
              </Box>
            )}
          </List>
        </Box>
        <Box sx={{ width: '66.66%', p: 3, overflowY: 'auto', height: '100%' }}>
          {selectedFile ? (
            <Box component="form" noValidate autoComplete="off">
              <Typography variant="h6" gutterBottom>Edit Metadata</Typography>
              <TextField 
                fullWidth label="Title" 
                value={selectedFile.title || ''} 
                onChange={(e) => setSelectedFile({...selectedFile, title: e.target.value})}
                margin="normal" 
              />
              <TextField 
                fullWidth label="Artist" 
                value={selectedFile.artist || ''} 
                onChange={(e) => setSelectedFile({...selectedFile, artist: e.target.value})}
                margin="normal" 
              />
              <TextField 
                fullWidth label="Album" 
                value={selectedFile.album || ''} 
                onChange={(e) => setSelectedFile({...selectedFile, album: e.target.value})}
                margin="normal" 
              />
              <TextField 
                fullWidth label="Year" 
                value={selectedFile.year || ''} 
                onChange={(e) => setSelectedFile({...selectedFile, year: Number(e.target.value)})}
                margin="normal" 
              />
              <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleSave}>Save Changes</Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">Select a file to edit metadata</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MusicWorkshop;
