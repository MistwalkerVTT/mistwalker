/**
 * No-op production stub for @mistwalker/3d.
 *
 * Used automatically when VITE_ENABLE_3D is not set (including all Render builds),
 * guaranteeing zero 3D bundle weight and zero dependency on ../Mistwalker 3D.
 */
import React from 'react';

export const MISTWALKER_3D_AVAILABLE = false;

export const Dungeon3DViewport: React.FC<any> = () => null;
export const Dungeon3DSandbox: React.FC<any> = () => null;

export const BUILTIN_MINIS_3D: any[] = [];
export const resolveModel3DForToken = (_token: any): undefined => undefined;
