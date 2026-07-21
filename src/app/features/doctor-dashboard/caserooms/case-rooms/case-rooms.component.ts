import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CaseRoomService } from '../../../../core/services/case-room.service';
import { UiService } from '../../../../core/services/ui.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { 
  CaseRoomResponseDto, 
  CaseRoomPostResponseDto, 
  CasePriority,
  CaseRoomStatus,
  PostType
} from '../../../../core/models/case-room.model';

@Component({
  selector: 'app-case-rooms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './case-rooms.component.html',
  styleUrls: []
})
export class CaseRoomsComponent implements OnInit, OnDestroy {
  private caseRoomService = inject(CaseRoomService);
  private uiService = inject(UiService);
  public authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private fb = inject(FormBuilder);

  public caseRooms: CaseRoomResponseDto[] = [];
  public selectedRoom: CaseRoomResponseDto | null = null;
  public posts: CaseRoomPostResponseDto[] = [];
  
  public patientsList: { patientId: string, patientName: string }[] = [];

  // Forms
  public showCreateModal = false;
  public createForm: FormGroup = this.fb.group({
    patientId: ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    priority: [CasePriority.ROUTINE, Validators.required]
  });

  public postForm: FormGroup = this.fb.group({
    body: ['', Validators.required],
    postType: [PostType.NOTE, Validators.required]
  });

  public priorityOptions = Object.values(CasePriority);
  public postTypeOptions = Object.values(PostType);
  public statusOptions = Object.values(CaseRoomStatus);

  public statusForm: FormGroup = this.fb.group({
    status: ['', Validators.required]
  });

  private pollInterval: any;

  ngOnInit(): void {
    this.loadCaseRooms();
    this.loadDoctorPatients();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadDoctorPatients(): void {
    this.appointmentService.getDoctorUpcomingAppointments().subscribe({
      next: (apps) => {
        const map = new Map<string, string>();
        for (const app of apps) {
          map.set(app.patientId, app.patientName);
        }
        this.patientsList = Array.from(map.entries()).map(([patientId, patientName]) => ({
          patientId, patientName
        }));
      }
    });
  }

  loadCaseRooms(): void {
    this.uiService.showLoading();
    // Fetch all for now, maybe filtered by doctor later
    this.caseRoomService.searchCaseRooms({
      page: 0,
      size: 50
    }).subscribe({
      next: (page) => {
        this.caseRooms = page.content || [];
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  selectRoom(room: CaseRoomResponseDto): void {
    this.selectedRoom = room;
    this.statusForm.patchValue({ status: room.status });
    this.loadPosts(room.caseRoomId);
    this.startPolling(room.caseRoomId);
  }

  loadPosts(roomId: string, isPolling = false): void {
    if (!isPolling) this.uiService.showLoading();
    this.caseRoomService.getPostsForRoom(roomId, 0, 100).subscribe({
      next: (page) => {
        const newPosts = page.content ? page.content.reverse() : [];
        const isNewMessage = this.posts.length !== newPosts.length;
        this.posts = newPosts;
        
        if (!isPolling) this.uiService.hideLoading();
        
        if (!isPolling || isNewMessage) {
           this.scrollToBottom();
        }
      },
      error: () => {
        if (!isPolling) this.uiService.hideLoading();
      }
    });
  }

  startPolling(roomId: string): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.loadPosts(roomId, true);
    }, 3000);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  submitPost(): void {
    if (this.postForm.invalid || !this.selectedRoom) return;
    
    this.uiService.showLoading();
    const val = this.postForm.value;
    
    this.caseRoomService.createPost({
      caseRoomId: this.selectedRoom.caseRoomId,
      postType: val.postType,
      body: val.body
    }).subscribe({
      next: (post) => {
        this.uiService.hideLoading();
        this.posts.push(post); // Append to bottom
        this.postForm.reset({ postType: PostType.NOTE });
        this.scrollToBottom();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to post');
      }
    });
  }

  updateRoomStatus(): void {
    if (this.statusForm.invalid || !this.selectedRoom) return;

    this.uiService.showLoading();
    this.caseRoomService.updateStatus(this.selectedRoom.caseRoomId, { status: this.statusForm.value.status }).subscribe({
      next: (updated) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Status updated');
        this.selectedRoom = updated;
        const idx = this.caseRooms.findIndex(r => r.caseRoomId === updated.caseRoomId);
        if (idx !== -1) {
          this.caseRooms[idx] = updated;
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to update status');
      }
    });
  }

  openCreateModal(): void {
    this.createForm.reset({ priority: CasePriority.ROUTINE });
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitCreateRoom(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    this.caseRoomService.openCaseRoom(this.createForm.value).subscribe({
      next: (room) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Case Room opened successfully');
        this.closeCreateModal();
        this.loadCaseRooms(); // Refresh list
        this.selectRoom(room); // Auto-select new room
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to open Case Room');
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('caseroom-posts-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
