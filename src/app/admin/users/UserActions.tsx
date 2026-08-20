"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pencil } from "lucide-react";
import { ToggleUserStatus } from "./ToggleUserStatus";
import { EditUserModal } from "./EditUserModal";
import { DeleteUserButton } from "./DeleteUserButton";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

export function UserActions({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
      {!isSelf && <DeleteUserButton userId={user.id} name={`${user.firstName} ${user.lastName}`} />}
      <ToggleUserStatus userId={user.id} isActive={user.isActive} />
      {editing && <EditUserModal user={user} isSelf={isSelf} onClose={() => setEditing(false)} />}
    </div>
  );
}