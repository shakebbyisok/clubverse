'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function BartendersPage() {
  const [bartenders] = useState([
    // Placeholder data - will be replaced with API calls
  ])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="dashed" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Bartender
        </Button>
      </div>

      {/* Bartenders List */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Staff Members</CardTitle>
          <CardDescription>All bartenders working at your club</CardDescription>
        </CardHeader>
        <CardContent>
          {bartenders.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">No bartenders yet</h3>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Get started by adding your first bartender
              </p>
              <Button variant="dashed" className="mt-3 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Bartender
              </Button>
            </div>
          ) : (
            <div className="rounded-[var(--radius)] border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Bartenders will be mapped here */}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

