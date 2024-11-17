import {hasConfig, setConfig} from "../services/ConfigService.js";


export async function initConfig(store) {

    if (!hasConfig(store, 'scan_paths')) {
        console.log('scan_paths initialized');
        setConfig(store, 'scan_paths', []);
    }

    if (!hasConfig(store, 'music_library')) {
        console.log('supported_formats initialized');
        setConfig(store, 'supported_formats', [
            "mp3",
            "wav",
            "flac",
            "ogg",
            "m4a",
            "aac",
            "webm",
            "opus",
            "oga"
        ]);
    }

    if (!hasConfig(store, 'port')) {
        console.log('proxy_port initialized');
        setConfig(store, 'port', 3000);
    }


    if (!hasConfig(store, 'data_path')) {
        console.log('hifini_cookie initialized');
        setConfig(store, 'hifini_cookie', {
            "bbs_sid": "",
            "bbs_token": ""
        });
    }
    if (!hasConfig(store, 'user_name')) {
        console.log('user_name initialized');
        setConfig('user_name', '');
    }
    if (!hasConfig(store, 'avatar_path')) {
        console.log('avatar_path initialized');
        setConfig(store, 'avatar_path', '');
    }


}