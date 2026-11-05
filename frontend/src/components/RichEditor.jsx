import { useEffect, useRef, useState } from 'react';
import { Box, Divider, IconButton, Paper, Stack, ToggleButton, Tooltip } from '@mui/material';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatUnderlined from '@mui/icons-material/FormatUnderlined';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import FormatQuote from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import Code from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import Title from '@mui/icons-material/Title';

/** Minimal WYSIWYG editor (contentEditable) with an HTML source toggle. Output is sanitised again on the server. */
export default function RichEditor({ value, onChange, onPickImage, minHeight = 320 }) {
  const ref = useRef(null);
  const [source, setSource] = useState(false);

  // Only push external value changes into the DOM (avoids caret jumps while typing).
  useEffect(() => {
    if (!source && ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || '';
  }, [value, source]);

  const exec = (cmd, arg = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current.innerHTML);
  };
  const link = () => { const url = window.prompt('Link URL (https://…)'); if (url) exec('createLink', url); };
  const image = async () => {
    const url = onPickImage ? await onPickImage() : window.prompt('Image URL');
    if (url) exec('insertImage', url);
  };

  const Btn = ({ title, onClick, children }) => (
    <Tooltip title={title}><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{children}</IconButton></Tooltip>
  );

  return (
    <Paper variant="outlined">
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ p: 0.5, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
        <Btn title="Heading" onClick={() => exec('formatBlock', 'h2')}><Title fontSize="small" /></Btn>
        <Btn title="Bold" onClick={() => exec('bold')}><FormatBold fontSize="small" /></Btn>
        <Btn title="Italic" onClick={() => exec('italic')}><FormatItalic fontSize="small" /></Btn>
        <Btn title="Underline" onClick={() => exec('underline')}><FormatUnderlined fontSize="small" /></Btn>
        <Divider flexItem orientation="vertical" />
        <Btn title="Bulleted list" onClick={() => exec('insertUnorderedList')}><FormatListBulleted fontSize="small" /></Btn>
        <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}><FormatListNumbered fontSize="small" /></Btn>
        <Btn title="Quote" onClick={() => exec('formatBlock', 'blockquote')}><FormatQuote fontSize="small" /></Btn>
        <Btn title="Link" onClick={link}><LinkIcon fontSize="small" /></Btn>
        <Btn title="Image" onClick={image}><ImageIcon fontSize="small" /></Btn>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Edit HTML source">
          <ToggleButton size="small" value="src" selected={source} onChange={() => setSource((s) => !s)} sx={{ border: 0 }}><Code fontSize="small" /></ToggleButton>
        </Tooltip>
      </Stack>
      {source ? (
        <Box component="textarea" value={value} onChange={(e) => onChange(e.target.value)}
          sx={{ width: '100%', minHeight, p: 2, border: 0, outline: 0, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', display: 'block' }} />
      ) : (
        <Box ref={ref} contentEditable suppressContentEditableWarning onInput={(e) => onChange(e.currentTarget.innerHTML)}
          sx={{ minHeight, p: 2, outline: 0, '& img': { maxWidth: '100%' }, '& blockquote': { borderLeft: '4px solid #ccd', m: 0, pl: 2, color: 'text.secondary' } }} />
      )}
    </Paper>
  );
}
