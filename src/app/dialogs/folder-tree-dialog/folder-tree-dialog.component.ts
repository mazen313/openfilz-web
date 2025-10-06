import {Component, Inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTreeModule} from '@angular/material/tree';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';

import {DocumentApiService} from '../../services/document-api.service';
import {ElementInfo} from '../../models/document.models';

export interface FolderTreeDialogData {
  title: string;
  currentFolderId?: string;
  excludeIds?: string[];
}

interface FolderNode {
  id?: string;
  name: string;
  children?: FolderNode[];
  loading?: boolean;
  loaded?: boolean;
}

@Component({
  selector: 'app-folder-tree-dialog',
  standalone: true,
  templateUrl: './folder-tree-dialog.component.html',
  styleUrls: ['./folder-tree-dialog.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTreeModule,
    MatProgressSpinnerModule
  ]
})
export class FolderTreeDialogComponent implements OnInit {
  treeControl = new NestedTreeControl<FolderNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<FolderNode>();
  selectedNode?: FolderNode;
  loading = true;

  constructor(
    private dialogRef: MatDialogRef<FolderTreeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FolderTreeDialogData,
    private documentApi: DocumentApiService
  ) {}

  ngOnInit() {
    this.loadRootFolders();
  }

  hasChild = (_: number, node: FolderNode) => !!node.children && node.children.length > 0;

  loadRootFolders() {
    this.loading = true;
    this.documentApi.listFolder(undefined, 1, 1000).subscribe({
      next: (items: ElementInfo[]) => {
        const folders = items
          .filter(item => item.type === 'FOLDER')
          .filter(item => !this.data.excludeIds?.includes(item.id));

        const rootNode: FolderNode = {
          name: 'Root',
          children: folders.map(folder => ({
            id: folder.id,
            name: folder.name,
            children: [],
            loaded: false
          })),
          loaded: true
        };

        this.dataSource.data = [rootNode];
        this.loading = false;
        this.treeControl.expand(rootNode);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onNodeClick(node: FolderNode) {
    this.selectedNode = node;

    if (!node.loaded && node.id) {
      node.loading = true;
      this.documentApi.listFolder(node.id, 1, 1000).subscribe({
        next: (items: ElementInfo[]) => {
          const folders = items
            .filter(item => item.type === 'FOLDER')
            .filter(item => !this.data.excludeIds?.includes(item.id));

          node.children = folders.map(folder => ({
            id: folder.id,
            name: folder.name,
            children: [],
            loaded: false
          }));
          node.loaded = true;
          node.loading = false;

          this.dataSource.data = [...this.dataSource.data];

          if (node.children.length > 0) {
            this.treeControl.expand(node);
          }
        },
        error: () => {
          node.loading = false;
        }
      });
    }
  }

  onToggle(node: FolderNode) {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.onNodeClick(node);
      this.treeControl.expand(node);
    }
  }

  onOk() {
    if (this.selectedNode) {
      this.dialogRef.close(this.selectedNode.id);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
