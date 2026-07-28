import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CaseRoomService } from '../../../../core/services/case-room.service';
import { UiService } from '../../../../core/services/ui.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { ConsultationService } from '../../../../core/services/consultation.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { ClinicalRecordService } from '../../../../core/services/clinical-record.service';
import { 
  CaseRoomResponseDto, 
  CaseRoomPostResponseDto, 
  CasePriority,
  CaseRoomStatus,
  PostType,
  CaseRoomMemberResponseDto
} from '../../../../core/models/case-room.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-case-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CustomSelectComponent, RouterLink],
  templateUrl: './case-rooms.component.html',
  styleUrls: ['./case-rooms.component.css']
})
export class CaseRoomsComponent implements OnInit, OnDestroy {
  private caseRoomService = inject(CaseRoomService);
  private uiService = inject(UiService);
  public authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private consultationService = inject(ConsultationService);
  private doctorService = inject(DoctorService);
  private clinicalRecordService = inject(ClinicalRecordService);
  private fb = inject(FormBuilder);

  public isChatActive = false;
  public caseRooms: CaseRoomResponseDto[] = [];
  public selectedRoom: CaseRoomResponseDto | null = null;
  public posts: CaseRoomPostResponseDto[] = [];
  public roomMembers: CaseRoomMemberResponseDto[] = [];
  
  public patientsList: { patientId: string, patientName: string }[] = [];
  public chatFile: File | null = null;

  get patientSelectOptions() {
    return this.patientsList.map(p => ({
      label: p.patientName,
      value: p.patientId
    }));
  }

  get prioritySelectOptions() {
    return this.priorityOptions.map(p => ({
      label: p,
      value: p
    }));
  }

  get statusSelectOptions() {
    return this.statusOptions.map(s => ({
      label: s.replace(/_/g, ' '),
      value: s
    }));
  }

  get postTypeSelectOptions() {
    return this.postTypeOptions.map(pt => ({
      label: pt.replace(/_/g, ' '),
      value: pt
    }));
  }

  get filteredDoctors() {
    if (!this.doctorSearchTerm.trim()) {
      return this.doctorsList;
    }
    const term = this.doctorSearchTerm.toLowerCase();
    return this.doctorsList.filter(doc => doc.fullName.toLowerCase().includes(term));
  }

  isDoctorSelected(doctorId: string): boolean {
    return this.selectedDoctorIds.includes(doctorId);
  }

  toggleDoctorSelection(doctorId: string): void {
    const idx = this.selectedDoctorIds.indexOf(doctorId);
    if (idx > -1) {
      this.selectedDoctorIds.splice(idx, 1);
    } else {
      this.selectedDoctorIds.push(doctorId);
    }
  }

  // Forms
  // Doctors Multi-select State
  public doctorsList: any[] = [];
  public selectedDoctorIds: string[] = [];
  public doctorSearchTerm = '';

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
    this.loadDoctors();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadDoctors(): void {
    const user = this.authService.currentUser();
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        // Exclude the current doctor from the list of doctors we can add as members
        this.doctorsList = docs.filter((d: any) => 
          !(user?.userId && d.userId === user.userId) &&
          !(user?.fullName && d.fullName?.toLowerCase() === user.fullName?.toLowerCase())
        );
      },
      error: () => this.doctorsList = []
    });
  }

  loadDoctorPatients(): void {
    const map = new Map<string, string>();

    const updateList = () => {
      this.patientsList = Array.from(map.entries()).map(([patientId, patientName]) => ({
        patientId,
        patientName
      }));
    };

    // 1. Fetch patients from appointments
    this.appointmentService.getDoctorUpcomingAppointments().subscribe({
      next: (apps) => {
        if (apps && Array.isArray(apps)) {
          for (const app of apps) {
            if (app.patientId && app.patientName) {
              map.set(app.patientId, app.patientName);
            }
          }
          updateList();
        }
      }
    });

    // 2. Fetch patients from tele-consultations
    this.consultationService.getMyDoctorConsultations(0, 100).subscribe({
      next: (page) => {
        const consultations = page.content || [];
        for (const c of consultations) {
          if (c.patientId && c.patientName) {
            map.set(c.patientId, c.patientName);
          }
        }
        updateList();
      },
      error: () => {
        const user = this.authService.currentUser();
        this.doctorService.getAllDoctors().subscribe({
          next: (docs) => {
            const doc = docs.find((d: any) => 
              (user?.userId && d.userId === user.userId) ||
              (user?.fullName && d.fullName?.toLowerCase() === user.fullName?.toLowerCase())
            );
            if (doc && doc.doctorId) {
              this.consultationService.getConsultationsByDoctor(doc.doctorId, 0, 100).subscribe({
                next: (page) => {
                  const consultations = page.content || [];
                  for (const c of consultations) {
                    if (c.patientId && c.patientName) {
                      map.set(c.patientId, c.patientName);
                    }
                  }
                  updateList();
                }
              });
            }
          }
        });
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
    this.roomMembers = [];
    this.caseRoomService.getMembersForRoom(room.caseRoomId).subscribe({
      next: (mems) => this.roomMembers = mems || [],
      error: () => this.roomMembers = []
    });
    this.loadPosts(room.caseRoomId);
    this.startPolling(room.caseRoomId);
    this.isChatActive = true;
  }

  backToInbox(): void {
    this.isChatActive = false;
  }

  loadPosts(roomId: string, isPolling = false): void {
    if (!isPolling) this.uiService.showLoading();
    this.caseRoomService.getPostsForRoom(roomId, 0, 100).subscribe({
      next: (page) => {
        const newPosts = page.content ? page.content : [];
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

  onChatFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.chatFile = target.files[0];
    }
  }

  clearChatFile(): void {
    this.chatFile = null;
  }

  downloadChatFile(fileId: string, filename: string): void {
    if (!fileId) return;
    this.uiService.showLoading();
    this.clinicalRecordService.downloadFile(fileId).subscribe({
      next: (blob) => {
        this.uiService.hideLoading();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'attachment';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to download attachment.');
      }
    });
  }

  submitPost(): void {
    if (!this.selectedRoom) return;
    
    const val = this.postForm.value;
    if (!val.body && !this.chatFile) return;

    this.uiService.showLoading();

    if (this.chatFile) {
      // Upload file first
      this.caseRoomService.uploadFile(this.chatFile, 'MEDICAL_RECORD', this.selectedRoom.patientId).subscribe({
        next: (fileMeta) => {
          const postType = PostType.FILE;
          const body = val.body || this.chatFile!.name;

          this.caseRoomService.createPost({
            caseRoomId: this.selectedRoom!.caseRoomId,
            postType: postType,
            body: body,
            fileId: fileMeta.fileId
          }).subscribe({
            next: (post) => {
              this.uiService.hideLoading();
              this.posts.push(post); // Append to bottom
              this.postForm.reset({ postType: PostType.NOTE });
              this.chatFile = null;
              this.scrollToBottom();
            },
            error: () => {
              this.uiService.hideLoading();
              this.uiService.showError('Failed to send file post.');
            }
          });
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError('Failed to upload file.');
        }
      });
    } else {
      this.caseRoomService.createPost({
        caseRoomId: this.selectedRoom.caseRoomId,
        postType: val.postType || PostType.NOTE,
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
          this.uiService.showError('Failed to post message.');
        }
      });
    }
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
    this.selectedDoctorIds = [];
    this.doctorSearchTerm = '';
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
        if (this.selectedDoctorIds.length > 0) {
          this.addCaseRoomMembers(room.caseRoomId, this.selectedDoctorIds, room);
        } else {
          this.uiService.hideLoading();
          this.uiService.showSuccess('Case Room opened successfully');
          this.closeCreateModal();
          this.loadCaseRooms(); // Refresh list
          this.selectRoom(room); // Auto-select new room
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to open Case Room');
      }
    });
  }

  addCaseRoomMembers(caseRoomId: string, doctorIds: string[], room: any): void {
    const requests = doctorIds.map(doctorId => 
      this.caseRoomService.addMember({
        caseRoomId,
        doctorId,
        role: 'CONTRIBUTOR' as any
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess(`Case Room opened and ${doctorIds.length} specialists invited.`);
        this.closeCreateModal();
        this.loadCaseRooms();
        this.selectRoom(room);
      },
      error: (err) => {
        this.uiService.hideLoading();
        console.error('Failed to invite some specialists:', err);
        this.uiService.showSuccess('Case Room opened, but inviting some specialists failed.');
        this.closeCreateModal();
        this.loadCaseRooms();
        this.selectRoom(room);
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
