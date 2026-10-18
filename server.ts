import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { aiRouter } from "./server/aiRoutes";
import { ddbRouter } from "./server/ddbRoutes";
import cors from "cors";
import { DdbHpSyncDaemon } from "./server/ddbCampaignService";
import { DdbGameLogDaemon } from "./server/ddbGameLogDaemon";
import { repairMonsterToken } from "./src/data/srdMonstersCatalog";



// Process crash guards to keep the server alive through network/AI spikes
process.on('uncaughtException', (err) => {
  console.error('[Server Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server Unhandled Rejection]:', reason);
});

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || (file.mimetype.includes('video') ? '.mp4' : '.png');
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e8, // 100MB
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Initialize D&D Beyond real-time HP synchronization daemon & GameLog dice daemon
  DdbHpSyncDaemon.getInstance().init(io);
  DdbGameLogDaemon.getInstance().init(io);

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;


  // Enable CORS with credentials support
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Logging middleware for all requests
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  // Body parsers with high limits for large tactical maps
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));
  // Guard against malformed JSON bodies
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      console.warn(`[Server] Bad JSON body rejected on ${req.method} ${req.url}:`, err.message);
      return res.status(400).json({ error: 'Malformed JSON payload' });
    }
    next(err);
  });

  // API Router - Define early
  const apiRouter = express.Router();

  // Health check
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  apiRouter.get("/ping", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Upload route supporting any field name ('map', 'file', 'token', etc.)
  apiRouter.post("/upload", (req, res) => {
    console.log(`[Server] POST /api/upload - Processing`);
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("[Server] Multer error:", err);
        return res.status(400).json({ 
          error: err instanceof multer.MulterError ? `Multer error: ${err.message}` : (err.message || "Upload error") 
        });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      const file = (files && files.length > 0) ? files[0] : req.file;

      if (!file) {
        console.error("[Server] Upload failed: No file in request");
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUrl = `/uploads/${file.filename}`;
      console.log(`[Server] Upload successful: ${fileUrl} (${file.size} bytes)`);
      res.json({ url: fileUrl });
    });
  });

  // Delete uploaded file from server disk
  apiRouter.delete("/upload", (req, res) => {
    try {
      const fileUrl = (req.query.url as string) || (req.body?.url as string);
      if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'Invalid file url' });
      }
      const filename = path.basename(fileUrl.split('?')[0]);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Server] Deleted file from disk: ${filePath}`);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Server] DELETE /api/upload error:", err);
      res.status(500).json({ error: err.message || "Failed to delete file" });
    }
  });

  // Fallback endpoint for base64 uploads (converts base64 data to server-hosted file)
  apiRouter.post("/upload-base64", (req, res) => {
    try {
      const { base64, filename, type = 'map' } = req.body || {};
      if (!base64 || typeof base64 !== 'string') {
        return res.status(400).json({ error: "Missing base64 data string" });
      }

      let dataBuffer: Buffer;
      let ext = '.png';

      if (base64.startsWith('data:')) {
        const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
          else if (mime.includes('webp')) ext = '.webp';
          else if (mime.includes('video/mp4')) ext = '.mp4';
          else if (mime.includes('video/webm')) ext = '.webm';
          else if (mime.includes('pdf')) ext = '.pdf';
          dataBuffer = Buffer.from(matches[2], 'base64');
        } else {
          const commaIdx = base64.indexOf(',');
          dataBuffer = Buffer.from(base64.substring(commaIdx + 1), 'base64');
        }
      } else {
        dataBuffer = Buffer.from(base64, 'base64');
      }

      const cleanName = (filename || `${type}_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const uniqueName = `${cleanName}-${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`;
      const destPath = path.join(uploadsDir, uniqueName);

      fs.writeFileSync(destPath, dataBuffer);
      const fileUrl = `/uploads/${uniqueName}`;
      console.log(`[Server] Base64 upload converted to static file: ${fileUrl} (${dataBuffer.length} bytes)`);
      res.json({ url: fileUrl, size: dataBuffer.length });
    } catch (err: any) {
      console.error("[Server] /upload-base64 error:", err);
      res.status(500).json({ error: err.message || "Failed to process base64 upload" });
    }
  });

  apiRouter.all("/upload", (req, res) => {
    res.status(405).json({ error: "Method not allowed. Use POST." });
  });

  // AI service routes
  apiRouter.use("/ai", aiRouter);
  apiRouter.use("/ddb", ddbRouter);

  // Mount API router
  app.use("/api", apiRouter);

  // Serve static uploads with automatic Firestore asset restoration on container restart
  app.get('/uploads/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Set CORS and byte-range headers for video streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    const isVideo = /\.(mp4|webm|m4v|mov|ogv)$/i.test(filename);
    console.log(`[Server] Upload file missing on disk: ${filename} (isVideo: ${isVideo}). Attempting Firestore recovery...`);

    // For video files, do NOT write an image thumbnail base64 string to the .mp4 file
    // Doing so corrupts the video container format.
    if (!isVideo) {
      try {
        const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const { initializeApp, getApps } = await import('firebase/app');
          const { getFirestore, collection, getDocs } = await import('firebase/firestore');
          const fbApp = getApps().length ? getApps()[0] : initializeApp(config);
          const db = getFirestore(fbApp, config.firestoreDatabaseId);

          // Check uploadedAssets collection
          const assetsSnap = await getDocs(collection(db, 'uploadedAssets'));
          let foundDataUrl: string | null = null;

          assetsSnap.forEach(d => {
            const data = d.data();
            if (data.url && (data.url.endsWith(filename) || path.basename(data.url) === filename)) {
              if (data.url && typeof data.url === 'string' && data.url.startsWith('data:image')) {
                foundDataUrl = data.url;
              } else if (data.thumbnailUrl && typeof data.thumbnailUrl === 'string' && data.thumbnailUrl.startsWith('data:image')) {
                foundDataUrl = data.thumbnailUrl;
              }
            }
          });

          // If not in uploadedAssets, check campaigns and chapters
          if (!foundDataUrl) {
            const campSnap = await getDocs(collection(db, 'campaigns'));
            campSnap.forEach(d => {
              const camp = d.data();
              if (camp?.chapters && Array.isArray(camp.chapters)) {
                for (const ch of camp.chapters) {
                  if (ch.scenes && Array.isArray(ch.scenes)) {
                    for (const sc of ch.scenes) {
                      if (sc.mapUrl && (sc.mapUrl.endsWith(filename) || path.basename(sc.mapUrl) === filename)) {
                        if (sc.mapUrl && typeof sc.mapUrl === 'string' && sc.mapUrl.startsWith('data:image')) {
                          foundDataUrl = sc.mapUrl;
                          break;
                        } else if (sc.mapThumbnailUrl && typeof sc.mapThumbnailUrl === 'string' && sc.mapThumbnailUrl.startsWith('data:image')) {
                          foundDataUrl = sc.mapThumbnailUrl;
                          break;
                        }
                      }
                      if (sc.tokens && Array.isArray(sc.tokens)) {
                        for (const tok of sc.tokens) {
                          if (tok.avatarUrl && (tok.avatarUrl.endsWith(filename) || path.basename(tok.avatarUrl) === filename)) {
                            if (tok.avatarUrl.startsWith('data:image')) {
                              foundDataUrl = tok.avatarUrl;
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            });
          }

          if (foundDataUrl) {
            const matches = (foundDataUrl as string).match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
              console.log(`[Server] Successfully recovered missing image upload /uploads/${filename} from Firestore!`);
              return res.sendFile(filePath);
            }
          }
        }
      } catch (recoverErr) {
        console.warn('[Server] Failed to auto-recover upload from Firestore:', recoverErr);
      }
    }

    // Critical: Return 404 so missing asset never falls through to Vite index.html SPA
    return res.status(404).json({ error: `Upload ${filename} not found` });
  });

  app.use('/uploads', express.static(uploadsDir));

  // Catch-all for API routes to prevent SPA fallback for missing API endpoints
  app.all("/api/*", (req, res) => {
    console.log(`[Server] 404 on API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found` });
  });

  // In-memory active VTT state cache for instantaneous synchronization across DM and Player views
  let activeVttState: {
    imageFile: string | null;
    mapDimensions: { width: number; height: number };
    tokens: any[];
    walls: any[];
    reveals: any[];
    polygonReveals: any[];
    isFogVisible: boolean;
    gridVisible: boolean;
    gridOpacity: number;
    gridSize: number;
    gridOffsetX: number;
    gridOffsetY: number;
    visionConfig: any;
    roomAnnotations: any[];
    mapRotation: number;
    activeSceneInfo: any;
    characters: any[];
    effects: any[];
    updatedAt: number;
  } = {
    imageFile: null,
    mapDimensions: { width: 1920, height: 1080 },
    tokens: [],
    walls: [],
    reveals: [],
    polygonReveals: [],
    isFogVisible: true,
    gridVisible: true,
    gridOpacity: 0.3,
    gridSize: 50,
    gridOffsetX: 0,
    gridOffsetY: 0,
    visionConfig: {
      enabled: true,
      explorationMemory: true,
      darknessOpacity: 1.0,
      dimVisionOpacity: 0.5,
      ambientLight: false,
      dmPreviewMode: false,
      showDoorBadges: false,
    },
    roomAnnotations: [],
    mapRotation: 0,
    activeSceneInfo: null,
    characters: [],
    effects: [],
    updatedAt: Date.now()
  };

  // Hydrate initial VTT state from Firestore activeSession/current on server startup
  (async () => {
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const fbApp = getApps().length ? getApps()[0] : initializeApp(config);
        const db = getFirestore(fbApp, config.firestoreDatabaseId);
        const sessSnap = await getDoc(doc(db, 'activeSession', 'current'));
        if (sessSnap.exists() && !activeVttState.imageFile) {
          const sess = sessSnap.data();
          const mapUrl = (sess.mapUrl && !String(sess.mapUrl).startsWith('blob:'))
            ? sess.mapUrl
            : (sess.mapThumbnailUrl || null);
          if (mapUrl) {
            activeVttState = {
              ...activeVttState,
              imageFile: mapUrl,
              mapDimensions: {
                width: sess.mapWidth || 1920,
                height: sess.mapHeight || 1080
              },
              tokens: Array.isArray(sess.tokens) ? sess.tokens.map((t: any) => repairMonsterToken(t)) : [],
              walls: Array.isArray(sess.walls) ? sess.walls : [],
              isFogVisible: sess.isFogVisible !== undefined ? sess.isFogVisible : true,
              gridSize: sess.gridSize || 50,
              gridOpacity: sess.gridOpacity ?? 0.3,
              visionConfig: sess.visionConfig || activeVttState.visionConfig,
              roomAnnotations: Array.isArray(sess.roomAnnotations) ? sess.roomAnnotations : [],
              effects: Array.isArray(sess.effects) ? sess.effects : [],
              activeSceneInfo: {
                campaignId: sess.campaignId,
                chapterId: sess.chapterId,
                sceneId: sess.sceneId,
                sceneTitle: sess.sceneTitle,
                mapUrl: mapUrl,
                mapThumbnailUrl: sess.mapThumbnailUrl,
                mapWidth: sess.mapWidth || 1920,
                mapHeight: sess.mapHeight || 1080
              },
              updatedAt: sess.updatedAt || Date.now()
            };
            console.log(`[Server] Hydrated activeVttState from Firestore: "${sess.sceneTitle}" (${mapUrl.slice(0, 80)})`);
            io.emit("SYNC_STATE", activeVttState);
            io.emit("SYNC_IMAGE", mapUrl);
          }
        }
      }
    } catch (err) {
      console.warn('[Server] Initial Firestore state hydration notice:', err);
    }
  })();

  // Socket.io connection & synchronization handlers
  io.on("connection", (socket) => {
    console.log(`[Server] User connected: ${socket.id}`);

    // If active state or map already exists in memory, immediately push to newly connected client
    if (activeVttState.imageFile || activeVttState.tokens.length > 0 || activeVttState.activeSceneInfo) {
      socket.emit("SYNC_STATE", activeVttState);
      if (activeVttState.imageFile) {
        socket.emit("SYNC_IMAGE", activeVttState.imageFile);
      }
    }

    // Explicit request for initial state from connecting Player View or DM view
    socket.on("REQUEST_INITIAL_STATE", () => {
      console.log(`[Server] Socket ${socket.id} requested initial state. Sending in-memory map: ${activeVttState.imageFile || 'none'}`);
      socket.emit("SYNC_STATE", activeVttState);
      if (activeVttState.imageFile) {
        socket.emit("SYNC_IMAGE", activeVttState.imageFile);
      }
      // Always notify connected DM clients so they can push their freshest live state
      socket.broadcast.emit("REQUEST_INITIAL_STATE");
    });

    // Authoritative image change synchronization
    socket.on("SYNC_IMAGE", (url: string) => {
      if (!url || url.startsWith('blob:')) return;
      console.log(`[Server] SYNC_IMAGE received: ${url.slice(0, 80)}`);
      activeVttState.imageFile = url;
      if (activeVttState.activeSceneInfo) {
        activeVttState.activeSceneInfo.mapUrl = url;
      }
      activeVttState.updatedAt = Date.now();
      socket.broadcast.emit("SYNC_IMAGE", url);
    });

    // Authoritative full or partial state synchronization
    socket.on("SYNC_STATE", (state: any) => {
      if (!state) return;

      const isPartialPatch =
        !('imageFile' in state) &&
        !('activeSceneInfo' in state) &&
        (Array.isArray(state.walls) ||
          Array.isArray(state.reveals) ||
          Array.isArray(state.polygonReveals) ||
          Array.isArray(state.effects) ||
          Array.isArray(state.boardAnimatedFeatures) ||
          state.isFogVisible !== undefined ||
          state.visionConfig !== undefined ||
          state.fogResetKey !== undefined);

      // Prevent an empty/uninitialized client from overwriting an active loaded map in memory
      if (!isPartialPatch && !state.imageFile && !state.activeSceneInfo?.mapUrl && activeVttState.imageFile) {
        console.log('[Server] Ignored blank SYNC_STATE: Active map session already loaded.');
        return;
      }

      if (isPartialPatch) {
        activeVttState = {
          ...activeVttState,
          ...state,
          updatedAt: Date.now()
        };
        socket.broadcast.emit("SYNC_STATE", state);
        return;
      }

      const incomingUrl = (state.imageFile && !String(state.imageFile).startsWith('blob:'))
        ? state.imageFile
        : ((state.activeSceneInfo?.mapUrl && !String(state.activeSceneInfo.mapUrl).startsWith('blob:'))
            ? state.activeSceneInfo.mapUrl
            : (state.activeSceneInfo?.mapThumbnailUrl || activeVttState.imageFile));

      const repairedTokens = Array.isArray(state.tokens)
        ? state.tokens.map((t: any) => repairMonsterToken(t))
        : activeVttState.tokens;

      console.log(`[Server] SYNC_STATE received. imageFile: ${incomingUrl?.slice(0, 80) || 'none'}, tokens: ${repairedTokens?.length || 0}`);
      activeVttState = {
        ...activeVttState,
        ...state,
        tokens: repairedTokens,
        imageFile: incomingUrl || activeVttState.imageFile,
        updatedAt: Date.now()
      };
      if (activeVttState.activeSceneInfo && incomingUrl) {
        activeVttState.activeSceneInfo.mapUrl = incomingUrl;
      }
      if (state.activeSceneInfo?.mapWidth && state.activeSceneInfo?.mapHeight) {
        activeVttState.mapDimensions = {
          width: state.activeSceneInfo.mapWidth,
          height: state.activeSceneInfo.mapHeight
        };
      }
      socket.broadcast.emit("SYNC_STATE", activeVttState);
    });

    socket.on("ADD_TOKEN", (token: any) => {
      if (token?.id && Array.isArray(activeVttState.tokens)) {
        const repaired = repairMonsterToken(token);
        if (!activeVttState.tokens.some((t: any) => t.id === repaired.id)) {
          activeVttState.tokens.push(repaired);
        }
        socket.broadcast.emit("ADD_TOKEN", repaired);
      } else {
        socket.broadcast.emit("ADD_TOKEN", token);
      }
    });

    socket.on("UPDATE_TOKEN", (data: { id: string; updates: Record<string, any> }) => {
      if (data?.id && data.updates && Array.isArray(activeVttState.tokens)) {
        activeVttState.tokens = activeVttState.tokens.map((t: any) =>
          t.id === data.id ? repairMonsterToken({ ...t, ...data.updates }) : t
        );
        socket.broadcast.emit("UPDATE_TOKEN", data);
      }
    });

    socket.on("DELETE_TOKEN", (data: { id: string } | string) => {
      const targetId = typeof data === 'string' ? data : data?.id;
      if (targetId && Array.isArray(activeVttState.tokens)) {
        activeVttState.tokens = activeVttState.tokens.filter((t: any) => t.id !== targetId);
        socket.broadcast.emit("DELETE_TOKEN", { id: targetId });
      }
    });

    socket.on("SYNC_SHAKE", (val: any) => {
      socket.broadcast.emit("SYNC_SHAKE", val);
    });

    socket.on("SYNC_LOCAL_DICE_ROLL", (data: any) => {
      socket.broadcast.emit("SYNC_LOCAL_DICE_ROLL", data);
    });

    socket.on("DDB_DICE_ROLLED", (data: any) => {
      socket.broadcast.emit("DDB_DICE_ROLLED", data);
    });

    socket.on("SYNC_AUDIO", (val: any) => {
      socket.broadcast.emit("SYNC_AUDIO", val);
    });

    socket.on("SYNC_CHAT", (val: any) => {
      socket.broadcast.emit("SYNC_CHAT", val);
    });

    socket.on("BROADCAST_ROOM_TEXT", (val: any) => {
      socket.broadcast.emit("BROADCAST_ROOM_TEXT", val);
    });

    socket.on("MOVE_TOKEN", (data: any) => {
      console.log(`[Server Socket] MOVE_TOKEN: id=${data?.id}, x=${data?.x}, y=${data?.y}`);
      if (data?.id && Array.isArray(activeVttState.tokens)) {
        activeVttState.tokens = activeVttState.tokens.map((t: any) =>
          t.id === data.id ? { ...t, x: data.x, y: data.y } : t
        );
      }
      socket.broadcast.emit("MOVE_TOKEN", data);
    });

    socket.on("SYNC_TOKENS", (tokens: any) => {
      console.log(`[Server Socket] SYNC_TOKENS: count=${Array.isArray(tokens) ? tokens.length : 0}`);
      if (Array.isArray(tokens)) {
        const repaired = tokens.map((t: any) => repairMonsterToken(t));
        activeVttState.tokens = repaired;
        socket.broadcast.emit("SYNC_TOKENS", repaired);
      } else {
        socket.broadcast.emit("SYNC_TOKENS", tokens);
      }
    });

    socket.on("SYNC_COMBAT_STATE", (val: any) => {
      if (val) {
        activeVttState.combatants = val.combatants || [];
        activeVttState.combatRound = val.round || 1;
        activeVttState.combatTurnIndex = val.turnIndex || 0;
        activeVttState.showCombatTracker = val.showCombatTracker !== false;
        if (Array.isArray(val.combatants) && Array.isArray(activeVttState.tokens)) {
          activeVttState.tokens = activeVttState.tokens.map((t: any) => {
            const match = val.combatants.find((c: any) =>
              c.id === t.id ||
              c.tokenId === t.id ||
              (c.name && t.name && String(c.name).toLowerCase().trim() === String(t.name).toLowerCase().trim())
            );
            if (match && Array.isArray(match.conditions)) {
              const mergedConds = Array.from(new Set([...(t.conditions || []), ...match.conditions]));
              return { ...t, conditions: mergedConds };
            }
            return t;
          });
        }
      }
      socket.broadcast.emit("SYNC_COMBAT_STATE", val);
    });

    socket.on("ADD_EFFECT", (effect: any) => {
      console.log(`[Server Socket] ADD_EFFECT: ${effect?.label || effect?.type || 'unknown'} at (${effect?.x}, ${effect?.y})`);
      if (effect && Array.isArray(activeVttState.effects)) {
        activeVttState.effects.push(effect);
      }
      socket.broadcast.emit("ADD_EFFECT", effect);
    });

    socket.on("REMOVE_EFFECT", (effectId: string) => {
      console.log(`[Server Socket] REMOVE_EFFECT: ${effectId}`);
      if (effectId && Array.isArray(activeVttState.effects)) {
        activeVttState.effects = activeVttState.effects.filter((e: any) => e.id !== effectId);
      }
      socket.broadcast.emit("REMOVE_EFFECT", effectId);
    });

    socket.on("CLEAR_EFFECTS", () => {
      console.log(`[Server Socket] CLEAR_EFFECTS`);
      activeVttState.effects = [];
      socket.broadcast.emit("CLEAR_EFFECTS");
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Server] User disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Final error handler to catch anything that falls through
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server] Unhandled error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
