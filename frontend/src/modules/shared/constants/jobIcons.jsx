/**
 * @file jobIcons.jsx
 * @description รายการ Icon สำหรับ Job Types ที่ใช้งานร่วมกัน
 */
import React from 'react';

export const JOB_ICONS = {
    social: {
        label: "Social Media",
        color: "blue",
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
    },
    banner: {
        label: "Banner Web",
        color: "purple",
        bg: "bg-purple-100",
        text: "text-purple-600",
        border: "border-purple-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    },
    print: {
        label: "Print Ad",
        color: "orange",
        bg: "bg-orange-100",
        text: "text-orange-600",
        border: "border-orange-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
    },
    edm: {
        label: "EDM",
        color: "teal",
        bg: "bg-teal-100",
        text: "text-teal-600",
        border: "border-teal-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    },
    video: {
        label: "Video Clip",
        color: "red",
        bg: "bg-red-100",
        text: "text-red-600",
        border: "border-red-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    },
    key_visual: {
        label: "Key Visual",
        color: "pink",
        bg: "bg-pink-100",
        text: "text-pink-600",
        border: "border-pink-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    },
    photography: {
        label: "Photography",
        color: "yellow",
        bg: "bg-yellow-100",
        text: "text-yellow-600",
        border: "border-yellow-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M9 15a3 3 0 106 0 3 3 0 00-6 0z"></path>
    },
    motion: {
        label: "Motion Graphics",
        color: "amber",
        bg: "bg-amber-100",
        text: "text-amber-600",
        border: "border-amber-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    },
    audio: {
        label: "Audio / Music",
        color: "green",
        bg: "bg-green-100",
        text: "text-green-600",
        border: "border-green-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path>
    },
    infographic: {
        label: "Infographic",
        color: "cyan",
        bg: "bg-cyan-100",
        text: "text-cyan-600",
        border: "border-cyan-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    },
    landing: {
        label: "Landing Page",
        color: "indigo",
        bg: "bg-indigo-100",
        text: "text-indigo-600",
        border: "border-indigo-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
    },
    social_reply: {
        label: "Social Comments",
        color: "lime",
        bg: "bg-lime-100",
        text: "text-lime-600",
        border: "border-lime-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
    }
};
