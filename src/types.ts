/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PRD {
  id: string;
  title: string;
  idea: string;
  context: string;
  content: string;
  createdAt: string;
}

export enum ViewMode {
  NEW = 'new',
  VIEW = 'view',
  HISTORY = 'history'
}
