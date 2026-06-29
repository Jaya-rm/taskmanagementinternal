from fastapi import FastAPI, APIRouter, HTTPException, Header, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Defaults ----------
DEFAULT_PASSCODE = "rmcategory26"
DEFAULT_OWNER_PIN = "9090"
DEFAULT_TEAM_NAME = "Category team"
DEFAULT_MEMBERS = [
    {"id": "jaya", "name": "Jaya", "role": "Category lead", "is_owner": True},
    {"id": "smrati", "name": "Smrati", "role": "Ecom associate", "is_owner": False},
    {"id": "harsh", "name": "Harsh", "role": "Furniture designer", "is_owner": False},
    {"id": "suman", "name": "Suman", "role": "Category associate", "is_owner": False},
    {"id": "bhavana", "name": "Bhavana", "role": "Cataloguing & survey", "is_owner": False},
    {"id": "thanushree", "name": "Thanushree", "role": "Survey & retention calling", "is_owner": False},
    {"id": "hardik", "name": "Hardik", "role": "Graphic design intern", "is_owner": False},
    {"id": "katyayani", "name": "Katyayani", "role": "Graphic design intern", "is_owner": False},
]

RECUR_DAYS = {
    "none": 0, "daily": 1, "every2days": 2, "weekly": 7,
    "biweekly": 14, "monthly": 30, "weekdays": 1,
}

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "", name or "").lower()
    return s or uuid.uuid4().hex[:6]

async def ensure_seed():
    settings = await db.settings.find_one({"_id": "main"})
    if not settings:
        await db.settings.insert_one({
            "_id": "main",
            "passcode": DEFAULT_PASSCODE,
            "owner_pin": DEFAULT_OWNER_PIN,
            "team_name": DEFAULT_TEAM_NAME,
        })
    if await db.members.count_documents({}) == 0:
        for m in DEFAULT_MEMBERS:
            await db.members.insert_one({**m, "_id": m["id"]})

async def get_settings_doc():
    s = await db.settings.find_one({"_id": "main"})
    return s or {}

async def require_owner(pin: Optional[str]):
    s = await get_settings_doc()
    if not pin or pin != s.get("owner_pin"):
        raise HTTPException(status_code=403, detail="Owner PIN required")

async def add_log(kind: str, task_id: Optional[str], actor: Optional[str], text: str, meta: Optional[dict] = None):
    await db.logs.insert_one({
        "_id": uuid.uuid4().hex,
        "kind": kind,
        "task_id": task_id,
        "actor": actor,
        "text": text,
        "meta": meta or {},
        "ts": now_iso(),
    })

def clean_doc(d: dict) -> dict:
    if not d:
        return d
    d = dict(d)
    if "_id" in d and "id" not in d:
        d["id"] = d["_id"]
    d.pop("_id", None)
    return d

# ---------- Models (request bodies) ----------
class PasscodeIn(BaseModel):
    passcode: str

class PinIn(BaseModel):
    pin: str

class MemberIn(BaseModel):
    name: str
    role: str = ""
    is_owner: bool = False

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_owner: Optional[bool] = None

class SettingsUpdate(BaseModel):
    passcode: Optional[str] = None
    owner_pin: Optional[str] = None
    team_name: Optional[str] = None

class TaskIn(BaseModel):
    title: str
    assignee: str
    assigned_by: str
    type: str = "Ad-hoc"
    status: str = "todo"
    assigned_date: str
    due_date: str
    recurrence: str = "none"
    repeat_until: Optional[str] = ""
    note: Optional[str] = ""

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    assignee: Optional[str] = None
    assigned_by: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    assigned_date: Optional[str] = None
    due_date: Optional[str] = None
    recurrence: Optional[str] = None
    repeat_until: Optional[str] = None
    note: Optional[str] = None
    hold_until: Optional[str] = None
    actor: Optional[str] = None  # who made the change

class CommentIn(BaseModel):
    author: str
    text: str

# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"ok": True, "service": "task-relay"}

@api_router.post("/auth/team")
async def auth_team(body: PasscodeIn):
    s = await get_settings_doc()
    return {"ok": body.passcode == s.get("passcode")}

@api_router.post("/auth/owner")
async def auth_owner(body: PinIn):
    s = await get_settings_doc()
    return {"ok": body.pin == s.get("owner_pin")}

@api_router.get("/settings")
async def get_settings():
    s = await get_settings_doc()
    return {"team_name": s.get("team_name", DEFAULT_TEAM_NAME)}

@api_router.get("/settings/full")
async def get_settings_full(x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    s = await get_settings_doc()
    return {
        "passcode": s.get("passcode"),
        "owner_pin": s.get("owner_pin"),
        "team_name": s.get("team_name"),
    }

@api_router.put("/settings")
async def update_settings(body: SettingsUpdate, x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if payload:
        await db.settings.update_one({"_id": "main"}, {"$set": payload})
    return {"ok": True}

# Members
@api_router.get("/members")
async def list_members():
    items = await db.members.find({}).to_list(500)
    return [clean_doc(m) for m in items]

@api_router.post("/members")
async def create_member(body: MemberIn, x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    base = slugify(body.name)
    mid = base
    i = 2
    while await db.members.find_one({"_id": mid}):
        mid = f"{base}{i}"
        i += 1
    doc = {"_id": mid, "id": mid, "name": body.name, "role": body.role, "is_owner": body.is_owner}
    await db.members.insert_one(doc)
    await add_log("member_create", None, None, f"Added member {body.name}")
    return clean_doc(doc)

@api_router.put("/members/{mid}")
async def update_member(mid: str, body: MemberUpdate, x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if payload:
        await db.members.update_one({"_id": mid}, {"$set": payload})
    doc = await db.members.find_one({"_id": mid})
    return clean_doc(doc)

@api_router.delete("/members/{mid}")
async def delete_member(mid: str, x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    doc = await db.members.find_one({"_id": mid})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.members.delete_one({"_id": mid})
    await add_log("member_delete", None, None, f"Removed member {doc.get('name')}")
    return {"ok": True}

# Tasks
@api_router.get("/tasks")
async def list_tasks():
    items = await db.tasks.find({}).sort("created_at", -1).to_list(2000)
    return [clean_doc(t) for t in items]

@api_router.post("/tasks")
async def create_task(body: TaskIn, x_actor: Optional[str] = Header(default=None)):
    tid = uuid.uuid4().hex
    doc = body.model_dump()
    doc.update({
        "_id": tid,
        "id": tid,
        "comments": [],
        "history": [{
            "ts": now_iso(),
            "actor": x_actor,
            "from": None,
            "to": doc.get("status", "todo"),
            "kind": "create",
        }],
        "hold_until": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.tasks.insert_one(doc)
    await add_log("task_create", tid, x_actor, f'Created "{body.title}" → {body.assignee}', {"task_title": body.title})
    return clean_doc(doc)

def _next_due(due: str, recurrence: str) -> str:
    days = RECUR_DAYS.get(recurrence, 0)
    if days <= 0:
        return due
    try:
        d = datetime.strptime(due, "%Y-%m-%d")
    except Exception:
        d = datetime.now()
    if recurrence == "weekdays":
        d = d + timedelta(days=1)
        while d.weekday() >= 5:
            d = d + timedelta(days=1)
    else:
        d = d + timedelta(days=days)
    return d.strftime("%Y-%m-%d")

@api_router.put("/tasks/{tid}")
async def update_task(tid: str, body: TaskUpdate):
    existing = await db.tasks.find_one({"_id": tid})
    if not existing:
        raise HTTPException(404, "Not found")
    payload = {k: v for k, v in body.model_dump().items() if v is not None and k != "actor"}
    actor = body.actor
    history = list(existing.get("history") or [])
    logs = []

    if "status" in payload and payload["status"] != existing.get("status"):
        history.append({
            "ts": now_iso(), "actor": actor,
            "from": existing.get("status"), "to": payload["status"], "kind": "status",
        })
        logs.append(("status_change", f'"{existing.get("title")}" {existing.get("status")} → {payload["status"]}'))
    if "assignee" in payload and payload["assignee"] != existing.get("assignee"):
        history.append({
            "ts": now_iso(), "actor": actor,
            "from": existing.get("assignee"), "to": payload["assignee"], "kind": "reassign",
        })
        logs.append(("reassign", f'"{existing.get("title")}" reassigned {existing.get("assignee")} → {payload["assignee"]}'))

    payload["history"] = history
    payload["updated_at"] = now_iso()
    await db.tasks.update_one({"_id": tid}, {"$set": payload})

    # Recurrence: if just marked done, spawn next task
    became_done = payload.get("status") == "done" and existing.get("status") != "done"
    if became_done:
        rec = existing.get("recurrence", "none")
        if rec and rec != "none":
            ru = existing.get("repeat_until") or ""
            next_due = _next_due(existing.get("due_date", ""), rec)
            if not ru or next_due <= ru:
                new_id = uuid.uuid4().hex
                new_doc = {
                    "_id": new_id, "id": new_id,
                    "title": existing.get("title"),
                    "assignee": payload.get("assignee", existing.get("assignee")),
                    "assigned_by": existing.get("assigned_by"),
                    "type": existing.get("type"),
                    "status": "todo",
                    "assigned_date": next_due,
                    "due_date": next_due,
                    "recurrence": rec,
                    "repeat_until": ru,
                    "note": existing.get("note", ""),
                    "comments": [],
                    "history": [{"ts": now_iso(), "actor": actor, "from": None, "to": "todo", "kind": "recur_create"}],
                    "hold_until": "",
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                }
                await db.tasks.insert_one(new_doc)
                logs.append(("recur_create", f'Recurring: created next "{new_doc["title"]}" due {next_due}'))

    for kind, txt in logs:
        await add_log(kind, tid, actor, txt, {"task_title": existing.get("title")})

    doc = await db.tasks.find_one({"_id": tid})
    return clean_doc(doc)

@api_router.delete("/tasks/{tid}")
async def delete_task(tid: str, x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    doc = await db.tasks.find_one({"_id": tid})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.tasks.delete_one({"_id": tid})
    await add_log("task_delete", tid, None, f'Deleted "{doc.get("title")}"')
    return {"ok": True}

@api_router.post("/tasks/{tid}/comment")
async def add_comment(tid: str, body: CommentIn):
    existing = await db.tasks.find_one({"_id": tid})
    if not existing:
        raise HTTPException(404, "Not found")
    comment = {"id": uuid.uuid4().hex, "author": body.author, "text": body.text, "ts": now_iso()}
    await db.tasks.update_one({"_id": tid}, {"$push": {"comments": comment}, "$set": {"updated_at": now_iso()}})
    await add_log("comment", tid, body.author, f'Comment on "{existing.get("title")}": {body.text[:80]}', {"task_title": existing.get("title")})

    # Parse mentions and spawn handoff tasks for mentioned members (excluding current assignee)
    members = await db.members.find({}).to_list(500)
    by_id = {m["_id"]: m for m in members}
    by_name = {m["name"].lower(): m for m in members}
    mentions = re.findall(r"@(\w+)", body.text or "")
    spawned = []
    for raw in mentions:
        key = raw.lower()
        m = by_id.get(key) or by_name.get(key)
        if not m:
            continue
        if m["_id"] == existing.get("assignee"):
            continue
        new_id = uuid.uuid4().hex
        today = datetime.now().strftime("%Y-%m-%d")
        new_doc = {
            "_id": new_id, "id": new_id,
            "title": f'Handoff: {body.text[:80]}',
            "assignee": m["_id"],
            "assigned_by": body.author,
            "type": "Handoff",
            "status": "todo",
            "assigned_date": today,
            "due_date": today,
            "recurrence": "none",
            "repeat_until": "",
            "note": f'From comment on "{existing.get("title")}"',
            "comments": [],
            "history": [{"ts": now_iso(), "actor": body.author, "from": None, "to": "todo", "kind": "handoff_create"}],
            "hold_until": "",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.tasks.insert_one(new_doc)
        await add_log("handoff_create", new_id, body.author, f'Handoff task → {m["name"]} from "{existing.get("title")}"', {})
        spawned.append(clean_doc(new_doc))

    doc = await db.tasks.find_one({"_id": tid})
    return {"task": clean_doc(doc), "spawned": spawned}

@api_router.get("/logs")
async def list_logs(limit: int = Query(default=500, ge=1, le=2000)):
    items = await db.logs.find({}).sort("ts", -1).to_list(limit)
    return [clean_doc(entry) for entry in items]

@api_router.post("/seed/reset")
async def seed_reset(x_owner_pin: Optional[str] = Header(default=None)):
    await require_owner(x_owner_pin)
    await db.tasks.delete_many({})
    await db.logs.delete_many({})
    return {"ok": True}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await ensure_seed()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
