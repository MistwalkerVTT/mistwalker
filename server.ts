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
import { settingsRouter } from "./server/settingsRoutes";
import cors from "cors";
import { DdbHpSyncDaemon } from "./server/ddbCampaignService";
import { DdbGameLogDaemon } from "./server/ddbGameLogDaemon";
import { repairMonsterToken } from "./src/data/srdMonstersCatalog";
import { sessionManager, ActiveVttState } from "./server/sessionManager";



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

  // Multi-tenant Room Code & Lobby inspection API
  apiRouter.get("/rooms/:code", (req, res) => {
    const rawCode = req.params.code;
    const resolvedSession = sessionManager.resolveRoomCode(rawCode);
    const roomCode = sessionManager.getOrCreateRoomCode(resolvedSession);
    const state = sessionManager.getSession(resolvedSession);
    const users = sessionManager.getRoomUsers(resolvedSession);
    const isLocked = sessionManager.isRoomLocked(resolvedSession);

    res.json({
      valid: true,
      sessionId: resolvedSession,
      roomCode,
      sceneTitle: state.activeSceneInfo?.sceneTitle || null,
      campaignId: state.activeSceneInfo?.campaignId || null,
      connectedCount: users.length,
      users,
      isLocked
    });
  });

  // DM room lock toggle
  apiRouter.post("/rooms/:code/lock", (req, res) => {
    const rawCode = req.params.code;
    const { locked } = req.body || {};
    const resolvedSession = sessionManager.resolveRoomCode(rawCode);
    const result = sessionManager.setRoomLock(resolvedSession, !!locked);
    io.to(resolvedSession).emit("ROOM_LOCK_UPDATED", { sessionId: resolvedSession, isLocked: result });
    res.json({ success: true, isLocked: result });
  });

  // Multi-session listing & state inspection endpoints
  apiRouter.get("/sessions", (req, res) => {
    res.json({ sessions: sessionManager.listSessions() });
  });

  apiRouter.get("/sessions/:id", (req, res) => {
    const session = sessionManager.getSession(req.params.id);
    res.json({ session });
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
  apiRouter.use("/settings", settingsRouter);

  // Local JB2A asset cache directory
  const jb2aCacheDir = path.resolve(process.cwd(), 'uploads', 'jb2a_cache');
  if (!fs.existsSync(jb2aCacheDir)) {
    fs.mkdirSync(jb2aCacheDir, { recursive: true });
  }

  // JB2A Animated Asset Streaming & Cache Proxy (guarantees video/webm MIME and 206 byte-range streaming)
  apiRouter.get("/effects/asset", async (req, res) => {
    try {
      const rawPath = String(req.query.path || '');
      if (!rawPath) {
        return res.status(400).send('Missing path parameter');
      }

      const cleanPath = rawPath.replace(/^(\/?modules\/JB2A_DnD5e\/)?/, '').replace(/^\/+/, '');
      if (cleanPath.includes('..')) {
        return res.status(403).send('Invalid path');
      }

      const cacheKey = cleanPath.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localFilePath = path.join(jb2aCacheDir, cacheKey);

      const isWebm = cleanPath.endsWith('.webm');
      const isWebp = cleanPath.endsWith('.webp');
      const contentType = isWebm ? 'video/webm' : (isWebp ? 'image/webp' : 'application/octet-stream');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (fs.existsSync(localFilePath)) {
        const stat = fs.statSync(localFilePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(localFilePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
          });
          return file.pipe(res);
        } else {
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fileSize);
          return fs.createReadStream(localFilePath).pipe(res);
        }
      }

      // Fetch upstream from official JB2A raw repository
      const upstreamUrl = `https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/${cleanPath}`;
      const upstreamRes = await fetch(upstreamUrl);
      if (!upstreamRes.ok) {
        return res.status(upstreamRes.status).send(`Upstream error: ${upstreamRes.statusText}`);
      }

      const buffer = Buffer.from(await upstreamRes.arrayBuffer());
      fs.writeFile(localFilePath, buffer, (err) => {
        if (err) console.warn('[JB2A Cache] Write failed:', err.message);
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err: any) {
      console.error('[JB2A Proxy Error]:', err.message);
      res.status(500).send('Error streaming JB2A asset');
    }
  });

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

  // Hydrate initial VTT state from Firestore activeSession/current on server startup into default session
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
        if (sessSnap.exists()) {
          const sess = sessSnap.data();
          const mapUrl = (sess.mapUrl && !String(sess.mapUrl).startsWith('blob:'))
            ? sess.mapUrl
            : (sess.mapThumbnailUrl || null);
          if (mapUrl) {
            const defState = sessionManager.updateSession('default', {
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
              visionConfig: sess.visionConfig,
              roomAnnotations: Array.isArray(sess.roomAnnotations) ? sess.roomAnnotations : [],
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
            });
            console.log(`[Server] Hydrated default session from Firestore: "${sess.sceneTitle}" (${mapUrl.slice(0, 80)})`);
            io.to('default').emit("SYNC_STATE", defState);
            io.to('default').emit("SYNC_IMAGE", mapUrl);
          }
        }
      }
    } catch (err) {
      console.warn('[Server] Initial Firestore state hydration notice:', err);
    }
  })();

  // Socket.io connection & multi-session synchronization handlers
  io.on("connection", (socket) => {
    // Resolve session room from query parameters, HTTP headers, or default
    const rawSession = (socket.handshake.query.sessionId as string) ||
                       (socket.handshake.headers['x-session-id'] as string) ||
                       'default';
    const initialSession = sessionManager.normalizeSessionId(rawSession);
    socket.join(initialSession);
    socket.data.sessionId = initialSession;
    console.log(`[Server] User connected: ${socket.id} (Session: "${initialSession}")`);

    const getRoom = (): string => socket.data.sessionId || 'default';

    // Push initial room state to newly connected client
    const currentSessionState = sessionManager.getSession(initialSession);
    if (currentSessionState.imageFile || currentSessionState.tokens.length > 0 || currentSessionState.activeSceneInfo) {
      socket.emit("SYNC_STATE", currentSessionState);
      if (currentSessionState.imageFile) {
        socket.emit("SYNC_IMAGE", currentSessionState.imageFile);
      }
    }

    // Explicit session room join or switch with 6-character room codes and lobby tracking
    socket.on("JOIN_SESSION", (data: {
      sessionId?: string;
      roomCode?: string;
      role?: 'dm' | 'player' | 'spectator';
      displayName?: string;
      uid?: string;
      characterName?: string;
      characterAvatar?: string;
    }) => {
      const prev = getRoom();
      const rawTarget = data?.roomCode || data?.sessionId || 'default';
      const resolvedSession = sessionManager.resolveRoomCode(rawTarget);
      const next = sessionManager.normalizeSessionId(resolvedSession);

      // Enforce Room Lock (only DM may bypass lock)
      if (sessionManager.isRoomLocked(next) && data?.role !== 'dm') {
        socket.emit("JOIN_ERROR", {
          message: "This room is currently locked by the Dungeon Master.",
          code: "ROOM_LOCKED"
        });
        return;
      }

      if (prev !== next) {
        socket.leave(prev);
        sessionManager.removeUserFromRoom(prev, socket.id);
        io.to(prev).emit("LOBBY_USERS_UPDATED", sessionManager.getRoomUsers(prev));

        socket.join(next);
        socket.data.sessionId = next;
        console.log(`[Server] Socket ${socket.id} joined session: "${next}" (from "${prev}")`);
      }

      const userRecord = {
        socketId: socket.id,
        uid: data?.uid,
        displayName: data?.displayName || (data?.role === 'dm' ? 'Dungeon Master' : 'Adventurer'),
        role: data?.role || 'player',
        characterName: data?.characterName,
        characterAvatar: data?.characterAvatar,
        joinedAt: Date.now()
      };
      sessionManager.addUserToRoom(next, userRecord);

      const state = sessionManager.getSession(next);
      const activeRoomCode = sessionManager.getOrCreateRoomCode(next);
      const isLocked = sessionManager.isRoomLocked(next);

      socket.emit("SYNC_STATE", state);
      if (state.imageFile) {
        socket.emit("SYNC_IMAGE", state.imageFile);
      }
      socket.emit("SESSION_RESOLVED", {
        sessionId: next,
        roomCode: activeRoomCode,
        isLocked
      });

      // Broadcast live lobby roster update to everyone in the room
      io.to(next).emit("LOBBY_USERS_UPDATED", sessionManager.getRoomUsers(next));

      socket.to(next).emit("USER_JOINED_SESSION", {
        socketId: socket.id,
        sessionId: next,
        role: userRecord.role,
        user: userRecord
      });
    });

    socket.on("TOGGLE_ROOM_LOCK", (data: { locked: boolean }) => {
      const r = getRoom();
      const isLocked = sessionManager.setRoomLock(r, !!data?.locked);
      io.to(r).emit("ROOM_LOCK_UPDATED", { sessionId: r, isLocked });
    });

    socket.on("REQUEST_ROOM_INFO", () => {
      const r = getRoom();
      socket.emit("ROOM_INFO", {
        sessionId: r,
        roomCode: sessionManager.getOrCreateRoomCode(r),
        users: sessionManager.getRoomUsers(r),
        isLocked: sessionManager.isRoomLocked(r)
      });
    });

    // Explicit request for initial state from connecting Player View or DM view
    socket.on("REQUEST_INITIAL_STATE", () => {
      const r = getRoom();
      const state = sessionManager.getSession(r);
      console.log(`[Server] Socket ${socket.id} requested initial state for session "${r}". Sending in-memory map: ${state.imageFile || 'none'}`);
      socket.emit("SYNC_STATE", state);
      if (state.imageFile) {
        socket.emit("SYNC_IMAGE", state.imageFile);
      }
      // Notify other connected clients in this room so DM view can refresh if needed
      socket.to(r).emit("REQUEST_INITIAL_STATE");
    });

    // DM refreshed browser - synchronize all connected players by reloading their windows
    socket.on("DM_BROWSER_REFRESHED", () => {
      console.log(`[Server] Socket ${socket.id} (DM) refreshed browser. Broadcasting FORCE_PLAYER_RELOAD to players...`);
      socket.broadcast.emit("FORCE_PLAYER_RELOAD");
    });

    // Authoritative image change synchronization
    socket.on("SYNC_IMAGE", (url: string) => {
      if (!url || url.startsWith('blob:')) return;
      const r = getRoom();
      console.log(`[Server] SYNC_IMAGE received for session "${r}": ${url.slice(0, 80)}`);
      sessionManager.updateSession(r, { imageFile: url });
      socket.to(r).emit("SYNC_IMAGE", url);
    });

    // Authoritative full or partial state synchronization
    socket.on("SYNC_STATE", (state: any) => {
      if (!state) return;
      const r = getRoom();
      const current = sessionManager.getSession(r);

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
      if (!isPartialPatch && !state.imageFile && !state.activeSceneInfo?.mapUrl && current.imageFile) {
        console.log(`[Server] Ignored blank SYNC_STATE for session "${r}": Active map session already loaded.`);
        return;
      }

      if (isPartialPatch) {
        sessionManager.updateSession(r, state);
        socket.to(r).emit("SYNC_STATE", state);
        return;
      }

      const incomingUrl = (state.imageFile && !String(state.imageFile).startsWith('blob:'))
        ? state.imageFile
        : ((state.activeSceneInfo?.mapUrl && !String(state.activeSceneInfo.mapUrl).startsWith('blob:'))
            ? state.activeSceneInfo.mapUrl
            : (state.activeSceneInfo?.mapThumbnailUrl || current.imageFile));

      const repairedTokens = Array.isArray(state.tokens)
        ? state.tokens.map((t: any) => repairMonsterToken(t))
        : current.tokens;

      console.log(`[Server] SYNC_STATE received for session "${r}". imageFile: ${incomingUrl?.slice(0, 80) || 'none'}, tokens: ${repairedTokens?.length || 0}`);
      const updated = sessionManager.updateSession(r, {
        ...state,
        tokens: repairedTokens,
        imageFile: incomingUrl || current.imageFile
      });
      socket.to(r).emit("SYNC_STATE", updated);
    });

    socket.on("ADD_TOKEN", (token: any) => {
      const r = getRoom();
      if (token?.id) {
        const repaired = repairMonsterToken(token);
        const curr = sessionManager.getSession(r);
        if (!curr.tokens.some((t: any) => t.id === repaired.id)) {
          curr.tokens.push(repaired);
        }
        socket.to(r).emit("ADD_TOKEN", repaired);
      } else {
        socket.to(r).emit("ADD_TOKEN", token);
      }
    });

    socket.on("UPDATE_TOKEN", (data: { id: string; updates: Record<string, any> }) => {
      const r = getRoom();
      if (data?.id && data.updates) {
        const curr = sessionManager.getSession(r);
        curr.tokens = curr.tokens.map((t: any) =>
          t.id === data.id ? repairMonsterToken({ ...t, ...data.updates }) : t
        );
        socket.to(r).emit("UPDATE_TOKEN", data);
      }
    });

    socket.on("DELETE_TOKEN", (data: { id: string } | string) => {
      const r = getRoom();
      const targetId = typeof data === 'string' ? data : data?.id;
      if (targetId) {
        const curr = sessionManager.getSession(r);
        curr.tokens = curr.tokens.filter((t: any) => t.id !== targetId);
        socket.to(r).emit("DELETE_TOKEN", { id: targetId });
      }
    });

    socket.on("SYNC_SHAKE", (val: any) => {
      socket.to(getRoom()).emit("SYNC_SHAKE", val);
    });

    socket.on("SYNC_LOCAL_DICE_ROLL", (data: any) => {
      socket.to(getRoom()).emit("SYNC_LOCAL_DICE_ROLL", data);
    });

    socket.on("DDB_DICE_ROLLED", (data: any) => {
      socket.to(getRoom()).emit("DDB_DICE_ROLLED", data);
    });

    socket.on("SYNC_AUDIO", (val: any) => {
      socket.to(getRoom()).emit("SYNC_AUDIO", val);
    });

    socket.on("SYNC_CHAT", (val: any) => {
      socket.to(getRoom()).emit("SYNC_CHAT", val);
    });

    socket.on("BROADCAST_ROOM_TEXT", (val: any) => {
      socket.to(getRoom()).emit("BROADCAST_ROOM_TEXT", val);
    });

    socket.on("MAP_PING", (pingData: any) => {
      if (pingData && typeof pingData.x === 'number' && typeof pingData.y === 'number') {
        socket.to(getRoom()).emit("MAP_PING", pingData);
      }
    });

    socket.on("HANDOUTS_SYNC", (data: any) => {
      if (data) {
        socket.to(getRoom()).emit("HANDOUTS_SYNC", data);
      }
    });

    socket.on("HANDOUT_PRESENT", (presentation: any) => {
      socket.to(getRoom()).emit("HANDOUT_PRESENT", presentation);
    });

    socket.on("HANDOUT_RIDDLE_GUESS", (guessData: any) => {
      if (guessData) {
        socket.to(getRoom()).emit("HANDOUT_RIDDLE_GUESS", guessData);
      }
    });

    socket.on("AUDIO_MIXER_SYNC", (mixerState: any) => {
      if (mixerState) {
        socket.to(getRoom()).emit("AUDIO_MIXER_SYNC", mixerState);
      }
    });

    socket.on("SOUNDBOARD_TRIGGER", (padPayload: any) => {
      if (padPayload?.padId) {
        socket.to(getRoom()).emit("SOUNDBOARD_TRIGGER", padPayload);
      }
    });

    socket.on("ARENA_LOBBY_ANNOUNCE", (lobbyEntry: any) => {
      if (lobbyEntry?.clientId) {
        socket.to(getRoom()).emit("ARENA_LOBBY_ANNOUNCE", lobbyEntry);
      }
    });

    socket.on("MOVE_TOKEN", (data: any) => {
      const r = getRoom();
      if (data?.id) {
        const curr = sessionManager.getSession(r);
        curr.tokens = curr.tokens.map((t: any) =>
          t.id === data.id ? { ...t, x: data.x, y: data.y } : t
        );
      }
      socket.to(r).emit("MOVE_TOKEN", data);
    });

    socket.on("PLAYER_MOVE_TOKEN", (data: any) => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);
      const id = data?.tokenId || data?.id;
      const x = data?.x;
      const y = data?.y;
      if (id && Array.isArray(curr.tokens)) {
        curr.tokens = curr.tokens.map((t: any) =>
          t.id === id ? { ...t, x, y } : t
        );
      }
      socket.to(r).emit("MOVE_TOKEN", { id, x, y, distanceMovedFt: data?.distanceMovedFt });
      socket.to(r).emit("PLAYER_MOVE_TOKEN", data);
    });

    socket.on("SYNC_TOKENS", (tokens: any) => {
      const r = getRoom();
      if (Array.isArray(tokens)) {
        const repaired = tokens.map((t: any) => repairMonsterToken(t));
        sessionManager.updateSession(r, { tokens: repaired });
        socket.to(r).emit("SYNC_TOKENS", repaired);
      } else {
        socket.to(r).emit("SYNC_TOKENS", tokens);
      }
    });

    socket.on("SYNC_COMBAT_STATE", (val: any) => {
      const r = getRoom();
      if (val) {
        const curr = sessionManager.getSession(r);
        curr.combatants = val.combatants || [];
        curr.combatRound = val.round || 1;
        curr.combatTurnIndex = val.turnIndex || 0;
        curr.showCombatTracker = val.showCombatTracker !== false;
        if (Array.isArray(val.combatants) && Array.isArray(curr.tokens)) {
          curr.tokens = curr.tokens.map((t: any) => {
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
      socket.to(r).emit("SYNC_COMBAT_STATE", val);
    });

    // Initiative rolling prompts & turn progression handlers
    socket.on("PROMPT_ROLL_INITIATIVE", (data: any) => {
      socket.to(getRoom()).emit("PROMPT_ROLL_INITIATIVE", data);
    });

    socket.on("SUBMIT_INITIATIVE", (data: { tokenId: string; characterName?: string; initiative: number }) => {
      socket.to(getRoom()).emit("SUBMIT_INITIATIVE", data);
    });

    socket.on("PLAYER_END_TURN", (data: { tokenId?: string; name?: string }) => {
      socket.to(getRoom()).emit("PLAYER_END_TURN", data);
    });

    // MistWalker Effects Engine Handlers
    socket.on("EFFECT_SPAWN", (effect: any) => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);
      if (effect && effect.id) {
        if (!Array.isArray(curr.effects)) curr.effects = [];
        if (effect.isPersistent || effect.loop) {
          curr.effects = curr.effects.filter((e: any) => e.id !== effect.id);
          curr.effects.push(effect);
        }
        socket.to(r).emit("EFFECT_SPAWN", effect);
      }
    });

    socket.on("EFFECT_UPDATE", (data: { id: string; updates: Record<string, any> }) => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);
      if (data?.id && data.updates && Array.isArray(curr.effects)) {
        curr.effects = curr.effects.map((e: any) =>
          e.id === data.id ? { ...e, ...data.updates } : e
        );
        socket.to(r).emit("EFFECT_UPDATE", data);
      }
    });

    socket.on("EFFECT_REMOVE", (data: { id: string } | string) => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);
      const targetId = typeof data === 'string' ? data : data?.id;
      if (targetId && Array.isArray(curr.effects)) {
        curr.effects = curr.effects.filter((e: any) => e.id !== targetId);
        socket.to(r).emit("EFFECT_REMOVE", { id: targetId });
      }
    });

    socket.on("EFFECT_CLEAR_ALL", () => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);
      curr.effects = [];
      socket.to(r).emit("EFFECT_CLEAR_ALL");
    });

    // Auto-Apply Monster Damage toggle setting
    socket.on("SET_AUTO_APPLY_MONSTER_DAMAGE", (enabled: boolean) => {
      const r = getRoom();
      sessionManager.updateSession(r, { autoApplyMonsterDamage: Boolean(enabled) });
      io.to(r).emit("SYNC_AUTO_APPLY_MONSTER_DAMAGE", Boolean(enabled));
    });

    // Targeted Healing / Damage Interaction Pipeline
    socket.on("REQUEST_TOKEN_MUTATION", (payload: {
      sourceTokenId: string;
      sourceName: string;
      targetTokenId: string;
      targetName: string;
      actionName: string;
      deltaHp: number;
      requiresApproval: boolean;
      requestId?: string;
      isMonster?: boolean;
    }) => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);

      if (payload.isMonster && payload.deltaHp < 0 && curr.autoApplyMonsterDamage === false) {
        io.to(r).emit("MONSTER_DAMAGE_REPORT", payload);
        return;
      }

      if (!payload.requiresApproval) {
        if (payload.targetTokenId && Array.isArray(curr.tokens)) {
          curr.tokens = curr.tokens.map((t: any) => {
            if (t.id === payload.targetTokenId) {
              const current = typeof t.currentHp === 'number' ? t.currentHp : (t.hp || 10);
              const max = typeof t.maxHp === 'number' ? t.maxHp : (t.hp || 10);
              const nextHp = Math.max(0, Math.min(max, current + payload.deltaHp));
              return { ...t, currentHp: nextHp, hp: nextHp };
            }
            return t;
          });
        }
        io.to(r).emit("APPLY_TOKEN_MUTATION", payload);
      } else {
        socket.to(r).emit("TOKEN_MUTATION_PROMPT", payload);
      }
    });

    socket.on("APPROVE_TOKEN_MUTATION", (payload: {
      requestId: string;
      targetTokenId: string;
      deltaHp: number;
    }) => {
      const r = getRoom();
      const curr = sessionManager.getSession(r);
      if (payload.targetTokenId && Array.isArray(curr.tokens)) {
        curr.tokens = curr.tokens.map((t: any) => {
          if (t.id === payload.targetTokenId) {
            const current = typeof t.currentHp === 'number' ? t.currentHp : (t.hp || 10);
            const max = typeof t.maxHp === 'number' ? t.maxHp : (t.hp || 10);
            const nextHp = Math.max(0, Math.min(max, current + payload.deltaHp));
            return { ...t, currentHp: nextHp, hp: nextHp };
          }
          return t;
        });
      }
      io.to(r).emit("APPLY_TOKEN_MUTATION", payload);
    });

    socket.on("ARENA_CONFIG_UPDATE", (payload) => {
      io.to(getRoom()).emit("ARENA_CONFIG_UPDATE", payload);
    });

    socket.on("disconnect", (reason) => {
      const r = getRoom();
      sessionManager.removeUserFromRoom(r, socket.id);
      io.to(r).emit("LOBBY_USERS_UPDATED", sessionManager.getRoomUsers(r));
      console.log(`[Server] User disconnected: ${socket.id} (Session: "${r}", reason: ${reason})`);
    }); });

  // Local static JB2A animated assets directory (zero-network-latency serving)
  const jb2aLocalDir = path.join(process.cwd(), 'public', 'jb2a');
  if (fs.existsSync(jb2aLocalDir)) {
    app.use('/jb2a', express.static(jb2aLocalDir, {
      maxAge: '7d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webm')) {
          res.setHeader('Content-Type', 'video/webm');
        } else if (filePath.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }));
  }

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

  const server = httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = PORT + 1;
      console.warn(`[Server] Port ${PORT} is already in use. Retrying on port ${nextPort}...`);
      httpServer.listen(nextPort, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${nextPort}`);
      });
    } else {
      console.error("[Server] Server listen error:", err);
    }
  });
}

startServer();
