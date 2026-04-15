// Centralized IPC channel names for main/preload/renderer usage
// Keep these strings stable to avoid hard-to-trace bugs.

export const Channels = {
  Config: {
    GetAll: 'config:getAll',
    Get: 'config:get',
    Set: 'config:set',
    SetByPath: 'config:setByPath',
    Patch: 'config:patch',
    Changed: 'config:changed',
  },
  Library: {
    GetLocalLibrary: 'library:getLocalLibrary',
    AddTrackToLibrary: 'library:addTrack',
    RemoveTrackFromLibrary: 'library:removeTrack',
    DownloadFromHifini: 'library:downloadFromHifini',
    IncreasePlayCount: 'library:increasePlayCount',
  },
  Lyrics: {
    Get: 'lyrics:get',
  },
  Track: {
    GetInfo: 'track:get-info',
    UpdateBasic: 'track:update-basic',
    CleanBasic: 'track:clean-basic',
  },
  Player: {
    LoadState: 'player:load-state',
    ReplyState: 'player:reply-state',
    Control: 'player:control',
    State: 'player:state',
    RequestState: 'player:request-state',
    RequestDump: 'player:request-dump',
    Notification: 'player:notification',
  },
  Playlist: {
    Create: 'playlist:create',
    GetAll: 'playlist:get-all',
    AddTrack: 'playlist:add-track',
    RemoveTrack: 'playlist:remove-track',
    Modify: 'playlist:modify',
    Remove: 'playlist:remove',
    Add: 'playlist:add',
    UpdatePositions: 'playlist:update-positions',
    UpdateTrackPositions: 'playlist:update-track-positions',
  },
  Search: {
    GetResults: 'search:get-results',
    LocalSearch: 'search:local-search',
    GetPlaylistDetail: 'search:get-playlist-detail',
  },
  System: {
    GetPlatform: 'system:get',
    RevealDB: 'system:reveal-db',
    CalcFileCacheDiskUsage: 'system:calculate-file-cache-disk-usage',
    GetAppVersion: 'system:get-app-version',
    GetAppAuthor: 'system:get-app-author',
    GetUserDataPath: 'system:get-user-data-path',
  },
  Window: {
    Controls: 'window:controls',
  },
  MiniPlayer: {
    Toggle: 'mini-player:toggle',
    Show: 'mini-player:show',
    Hide: 'mini-player:hide',
    SetExpanded: 'mini-player:set-expanded',
  },
  Shortcut: {
    Global: 'shortcut:global',
  },
  YouTubeMusic: {
    OpenLogin: 'youtube:open-login-window',
    SyncCredentials: 'youtube:sync-credentials',
    CloseLogin: 'youtube:close-login-window',
  },
  Profile: {
    List: 'profile:list',
    GetActive: 'profile:get-active',
    Create: 'profile:create',
    Switch: 'profile:switch',
  },
  CreatorsWorkshop: {
    Show: 'creators-workshop:show',
    ReadMetadata: 'creators-workshop:read-metadata',
    WriteMetadata: 'creators-workshop:write-metadata',
  },
} as const;

export type ChannelGroups = typeof Channels;
export type ChannelValue = ChannelGroups[keyof ChannelGroups][keyof ChannelGroups[keyof ChannelGroups]];
