"use client"

import * as React from "react"
import { supabaseService } from "../services/supabase-service"
import { db } from "../services/database" 
import type { DistributedNote } from "../types/distributed"
import { toast } from "sonner"
import { useNotesWithSync } from "./use-notes-with-sync"

export function useNotesWithSupabase() {
  return useNotesWithSync()
}
