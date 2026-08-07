import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { UserService } from '../../../core/services/user.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { BloodType, MaritalStatus } from '../../../core/models/patient.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CustomSelectComponent, TranslatePipe, ApiUrlPipe],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private patientService = inject(PatientService);
  public userService = inject(UserService);
  private uiService = inject(UiService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  public languageService = inject(LanguageService);

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
  public stagedAvatarFile: File | null = null;
  public stagedAvatarPreviewUrl: string | null = null;

  // Account (User) Profile state
  public isEditingAccount = false;
  public accountForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    gender: ['MALE'],
    preferredLang: ['en']
  });

  // Medical (Patient) Profile state
  public isEditMode = false;
  public profileExists = false;

  public bloodTypes = Object.values(BloodType);
  public maritalStatuses = Object.values(MaritalStatus);

  get bloodTypeOptions() {
    return this.bloodTypes.map(bt => ({
      label: bt.replace('_POS', '+').replace('_NEG', '-').replace('_', ' '),
      value: bt
    }));
  }

  get nationalityOptions() {
    return this.nationalities.map(nat => ({
      label: this.languageService.isArabic ? nat.nameAr : nat.nameEn,
      value: nat.code,
      flagUrl: `https://flagcdn.com/w40/${nat.code.toLowerCase()}.png`,
      nameEn: nat.nameEn,
      nameAr: nat.nameAr,
      code: nat.code
    }));
  }

  get maritalStatusOptions() {
    return this.maritalStatuses.map(ms => ({
      label: this.languageService.translate(ms, this.getMaritalStatusAr(ms)),
      value: ms
    }));
  }

  get genderOptions() {
    return [
      { label: this.languageService.translate('Male', 'ذكر'), value: 'MALE' },
      { label: this.languageService.translate('Female', 'أنثى'), value: 'FEMALE' },
      { label: this.languageService.translate('Other', 'آخر'), value: 'OTHER' }
    ];
  }

  get langOptions() {
    return [
      { label: 'English', value: 'en' },
      { label: 'العربية', value: 'ar' }
    ];
  }

  private getMaritalStatusAr(ms: string): string {
    switch (ms) {
      case MaritalStatus.SINGLE: return 'أعزب';
      case MaritalStatus.MARRIED: return 'متزوج';
      case MaritalStatus.DIVORCED: return 'مطلق';
      case MaritalStatus.WIDOWED: return 'أرمل';
      default: return ms;
    }
  }

  public nationalities: { code: string; flag: string; nameEn: string; nameAr: string }[] = [
    // GCC & Arab Countries
    { code: 'SA', flag: '🇸🇦', nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية' },
    { code: 'AE', flag: '🇦🇪', nameEn: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة' },
    { code: 'KW', flag: '🇰🇼', nameEn: 'Kuwait', nameAr: 'الكويت' },
    { code: 'QA', flag: '🇶🇦', nameEn: 'Qatar', nameAr: 'قطر' },
    { code: 'BH', flag: '🇧🇭', nameEn: 'Bahrain', nameAr: 'البحرين' },
    { code: 'OM', flag: '🇴🇲', nameEn: 'Oman', nameAr: 'عُمان' },
    { code: 'EG', flag: '🇪🇬', nameEn: 'Egypt', nameAr: 'مصر' },
    { code: 'JO', flag: '🇯🇴', nameEn: 'Jordan', nameAr: 'الأردن' },
    { code: 'LB', flag: '🇱🇧', nameEn: 'Lebanon', nameAr: 'لبنان' },
    { code: 'SY', flag: '🇸🇾', nameEn: 'Syria', nameAr: 'سوريا' },
    { code: 'YE', flag: '🇾🇪', nameEn: 'Yemen', nameAr: 'اليمن' },
    { code: 'IQ', flag: '🇮🇶', nameEn: 'Iraq', nameAr: 'العراق' },
    { code: 'SD', flag: '🇸🇩', nameEn: 'Sudan', nameAr: 'السودان' },
    { code: 'PS', flag: '🇵🇸', nameEn: 'Palestine', nameAr: 'فلسطين' },
    { code: 'TN', flag: '🇹🇳', nameEn: 'Tunisia', nameAr: 'تونس' },
    { code: 'MA', flag: '🇲🇦', nameEn: 'Morocco', nameAr: 'المغرب' },
    { code: 'DZ', flag: '🇩🇿', nameEn: 'Algeria', nameAr: 'الجزائر' },
    { code: 'LY', flag: '🇱🇾', nameEn: 'Libya', nameAr: 'ليبيا' },
    { code: 'SO', flag: '🇸🇴', nameEn: 'Somalia', nameAr: 'الصومال' },
    { code: 'MR', flag: '🇲🇷', nameEn: 'Mauritania', nameAr: 'موريتانيا' },
    { code: 'DJ', flag: '🇩🇯', nameEn: 'Djibouti', nameAr: 'جيبوتي' },
    { code: 'KM', flag: '🇰🇲', nameEn: 'Comoros', nameAr: 'جزر القمر' },

    // Asia & Pacific
    { code: 'AF', flag: '🇦🇫', nameEn: 'Afghanistan', nameAr: 'أفغانستان' },
    { code: 'AU', flag: '🇦🇺', nameEn: 'Australia', nameAr: 'أستراليا' },
    { code: 'BD', flag: '🇧🇩', nameEn: 'Bangladesh', nameAr: 'بنجلاديش' },
    { code: 'BT', flag: '🇧🇹', nameEn: 'Bhutan', nameAr: 'بوتان' },
    { code: 'BN', flag: '🇧🇳', nameEn: 'Brunei', nameAr: 'بروناي' },
    { code: 'KH', flag: '🇰🇭', nameEn: 'Cambodia', nameAr: 'كمبوديا' },
    { code: 'CN', flag: '🇨🇳', nameEn: 'China', nameAr: 'الصين' },
    { code: 'FJ', flag: '🇫🇯', nameEn: 'Fiji', nameAr: 'فيجي' },
    { code: 'IN', flag: '🇮🇳', nameEn: 'India', nameAr: 'الهند' },
    { code: 'ID', flag: '🇮🇩', nameEn: 'Indonesia', nameAr: 'إندونيسيا' },
    { code: 'IR', flag: '🇮🇷', nameEn: 'Iran', nameAr: 'إيران' },
    { code: 'JP', flag: '🇯🇵', nameEn: 'Japan', nameAr: 'اليابان' },
    { code: 'KZ', flag: '🇰🇿', nameEn: 'Kazakhstan', nameAr: 'كازاخستان' },
    { code: 'KG', flag: '🇰🇬', nameEn: 'Kyrgyzstan', nameAr: 'قيرغيزستان' },
    { code: 'LA', flag: '🇱🇦', nameEn: 'Laos', nameAr: 'لاوس' },
    { code: 'MY', flag: '🇲🇾', nameEn: 'Malaysia', nameAr: 'ماليزيا' },
    { code: 'MV', flag: '🇲🇻', nameEn: 'Maldives', nameAr: 'جزر المالديف' },
    { code: 'MN', flag: '🇲🇳', nameEn: 'Mongolia', nameAr: 'منغوليا' },
    { code: 'MM', flag: '🇲🇲', nameEn: 'Myanmar', nameAr: 'ميانمار' },
    { code: 'NP', flag: '🇳🇵', nameEn: 'Nepal', nameAr: 'نيبال' },
    { code: 'NZ', flag: '🇳🇿', nameEn: 'New Zealand', nameAr: 'نيوزيلندا' },
    { code: 'KP', flag: '🇰🇵', nameEn: 'North Korea', nameAr: 'كوريا الشمالية' },
    { code: 'PK', flag: '🇵🇰', nameEn: 'Pakistan', nameAr: 'باكستان' },
    { code: 'PG', flag: '🇵🇬', nameEn: 'Papua New Guinea', nameAr: 'بابوا غينيا الجديدة' },
    { code: 'PH', flag: '🇵🇭', nameEn: 'Philippines', nameAr: 'الفلبين' },
    { code: 'SG', flag: '🇸🇬', nameEn: 'Singapore', nameAr: 'سنغافورة' },
    { code: 'KR', flag: '🇰🇷', nameEn: 'South Korea', nameAr: 'كوريا الجنوبية' },
    { code: 'LK', flag: '🇱🇰', nameEn: 'Sri Lanka', nameAr: 'سريلانكا' },
    { code: 'TW', flag: '🇹🇼', nameEn: 'Taiwan', nameAr: 'تايوان' },
    { code: 'TJ', flag: '🇹🇯', nameEn: 'Tajikistan', nameAr: 'طاجيكستان' },
    { code: 'TH', flag: '🇹🇭', nameEn: 'Thailand', nameAr: 'تايلاند' },
    { code: 'TM', flag: '🇹🇲', nameEn: 'Turkmenistan', nameAr: 'تركمانستان' },
    { code: 'UZ', flag: '🇺🇿', nameEn: 'Uzbekistan', nameAr: 'أوزبكستان' },
    { code: 'VN', flag: '🇻🇳', nameEn: 'Vietnam', nameAr: 'فيتنام' },

    // Europe
    { code: 'AL', flag: '🇦🇱', nameEn: 'Albania', nameAr: 'ألبانيا' },
    { code: 'AD', flag: '🇦🇩', nameEn: 'Andorra', nameAr: 'أندورا' },
    { code: 'AM', flag: '🇦🇲', nameEn: 'Armenia', nameAr: 'أرمينيا' },
    { code: 'AT', flag: '🇦🇹', nameEn: 'Austria', nameAr: 'النمسا' },
    { code: 'AZ', flag: '🇦🇿', nameEn: 'Azerbaijan', nameAr: 'أذربيجان' },
    { code: 'BY', flag: '🇧🇾', nameEn: 'Belarus', nameAr: 'بيلاروسيا' },
    { code: 'BE', flag: '🇧🇪', nameEn: 'Belgium', nameAr: 'بلجيكا' },
    { code: 'BA', flag: '🇧🇦', nameEn: 'Bosnia and Herzegovina', nameAr: 'البوسنة والهرسك' },
    { code: 'BG', flag: '🇧🇬', nameEn: 'Bulgaria', nameAr: 'بلغاريا' },
    { code: 'HR', flag: '🇭🇷', nameEn: 'Croatia', nameAr: 'كرواتيا' },
    { code: 'CY', flag: '🇨🇾', nameEn: 'Cyprus', nameAr: 'قبرص' },
    { code: 'CZ', flag: '🇨🇿', nameEn: 'Czech Republic', nameAr: 'التشيك' },
    { code: 'DK', flag: '🇩🇰', nameEn: 'Denmark', nameAr: 'الدنمارك' },
    { code: 'EE', flag: '🇪🇪', nameEn: 'Estonia', nameAr: 'إستونيا' },
    { code: 'FI', flag: '🇫🇮', nameEn: 'Finland', nameAr: 'فنلندا' },
    { code: 'FR', flag: '🇫🇷', nameEn: 'France', nameAr: 'فرنسا' },
    { code: 'GE', flag: '🇬🇪', nameEn: 'Georgia', nameAr: 'جورجيا' },
    { code: 'DE', flag: '🇩🇪', nameEn: 'Germany', nameAr: 'ألمانيا' },
    { code: 'GR', flag: '🇬🇷', nameEn: 'Greece', nameAr: 'اليونان' },
    { code: 'HU', flag: '🇭🇺', nameEn: 'Hungary', nameAr: 'المجر' },
    { code: 'IS', flag: '🇮🇸', nameEn: 'Iceland', nameAr: 'أيسلندا' },
    { code: 'IE', flag: '🇮🇪', nameEn: 'Ireland', nameAr: 'أيرلندا' },
    { code: 'IT', flag: '🇮🇹', nameEn: 'Italy', nameAr: 'إيطاليا' },
    { code: 'XK', flag: '🇽🇰', nameEn: 'Kosovo', nameAr: 'كوسوفو' },
    { code: 'LV', flag: '🇱🇻', nameEn: 'Latvia', nameAr: 'لاتفيا' },
    { code: 'LI', flag: '🇱🇮', nameEn: 'Liechtenstein', nameAr: 'ليختنشتاين' },
    { code: 'LT', flag: '🇱🇹', nameEn: 'Lithuania', nameAr: 'ليتوانيا' },
    { code: 'LU', flag: '🇱🇺', nameEn: 'Luxembourg', nameAr: 'لوكسمبورغ' },
    { code: 'MT', flag: '🇲🇹', nameEn: 'Malta', nameAr: 'مالطا' },
    { code: 'MD', flag: '🇲🇩', nameEn: 'Moldova', nameAr: 'مولدوفا' },
    { code: 'MC', flag: '🇲🇨', nameEn: 'Monaco', nameAr: 'موناكو' },
    { code: 'ME', flag: '🇲🇪', nameEn: 'Montenegro', nameAr: 'الجبل الأسود' },
    { code: 'NL', flag: '🇳🇱', nameEn: 'Netherlands', nameAr: 'هولندا' },
    { code: 'MK', flag: '🇲🇰', nameEn: 'North Macedonia', nameAr: 'مقدونيا الشمالية' },
    { code: 'NO', flag: '🇳🇴', nameEn: 'Norway', nameAr: 'النرويج' },
    { code: 'PL', flag: '🇵🇱', nameEn: 'Poland', nameAr: 'بولندا' },
    { code: 'PT', flag: '🇵🇹', nameEn: 'Portugal', nameAr: 'البرتغال' },
    { code: 'RO', flag: '🇷🇴', nameEn: 'Romania', nameAr: 'رومانيا' },
    { code: 'RU', flag: '🇷🇺', nameEn: 'Russia', nameAr: 'روسيا' },
    { code: 'SM', flag: '🇸🇲', nameEn: 'San Marino', nameAr: 'سان مارينو' },
    { code: 'RS', flag: '🇷🇸', nameEn: 'Serbia', nameAr: 'صربيا' },
    { code: 'SK', flag: '🇸🇰', nameEn: 'Slovakia', nameAr: 'سلوفاكيا' },
    { code: 'SI', flag: '🇸🇮', nameEn: 'Slovenia', nameAr: 'سلوفينيا' },
    { code: 'ES', flag: '🇪🇸', nameEn: 'Spain', nameAr: 'إسبانيا' },
    { code: 'SE', flag: '🇸🇪', nameEn: 'Sweden', nameAr: 'السويد' },
    { code: 'CH', flag: '🇨🇭', nameEn: 'Switzerland', nameAr: 'سويسرا' },
    { code: 'TR', flag: '🇹🇷', nameEn: 'Turkey', nameAr: 'تركيا' },
    { code: 'UA', flag: '🇺🇦', nameEn: 'Ukraine', nameAr: 'أوكرانيا' },
    { code: 'GB', flag: '🇬🇧', nameEn: 'United Kingdom', nameAr: 'المملكة المتحدة' },
    { code: 'VA', flag: '🇻🇦', nameEn: 'Vatican City', nameAr: 'الفاتيكان' },

    // Americas
    { code: 'AR', flag: '🇦🇷', nameEn: 'Argentina', nameAr: 'الأرجنتين' },
    { code: 'BS', flag: '🇧🇸', nameEn: 'Bahamas', nameAr: 'باهاماس' },
    { code: 'BB', flag: '🇧🇧', nameEn: 'Barbados', nameAr: 'باربادوس' },
    { code: 'BZ', flag: '🇧🇿', nameEn: 'Belize', nameAr: 'بليز' },
    { code: 'BO', flag: '🇧🇴', nameEn: 'Bolivia', nameAr: 'بوليفيا' },
    { code: 'BR', flag: '🇧🇷', nameEn: 'Brazil', nameAr: 'البرازيل' },
    { code: 'CA', flag: '🇨🇦', nameEn: 'Canada', nameAr: 'كندا' },
    { code: 'CL', flag: '🇨🇱', nameEn: 'Chile', nameAr: 'تشيلي' },
    { code: 'CO', flag: '🇨🇴', nameEn: 'Colombia', nameAr: 'كولومبيا' },
    { code: 'CR', flag: '🇨🇷', nameEn: 'Costa Rica', nameAr: 'كوستاريكا' },
    { code: 'CU', flag: '🇨🇺', nameEn: 'Cuba', nameAr: 'كوبا' },
    { code: 'DO', flag: '🇩🇴', nameEn: 'Dominican Republic', nameAr: 'جمهورية الدومينيكان' },
    { code: 'EC', flag: '🇪🇨', nameEn: 'Ecuador', nameAr: 'الإكوادور' },
    { code: 'SV', flag: '🇸🇻', nameEn: 'El Salvador', nameAr: 'السلفادور' },
    { code: 'GT', flag: '🇬🇹', nameEn: 'Guatemala', nameAr: 'غواتيمالا' },
    { code: 'GY', flag: '🇬🇾', nameEn: 'Guyana', nameAr: 'غيانا' },
    { code: 'HT', flag: '🇭🇹', nameEn: 'Haiti', nameAr: 'هايتي' },
    { code: 'HN', flag: '🇭🇳', nameEn: 'Honduras', nameAr: 'هندوراس' },
    { code: 'JM', flag: '🇯🇲', nameEn: 'Jamaica', nameAr: 'جامايكا' },
    { code: 'MX', flag: '🇲🇽', nameEn: 'Mexico', nameAr: 'المكسيك' },
    { code: 'NI', flag: '🇳🇮', nameEn: 'Nicaragua', nameAr: 'نيكاراغوا' },
    { code: 'PA', flag: '🇵🇦', nameEn: 'Panama', nameAr: 'بنما' },
    { code: 'PY', flag: '🇵🇾', nameEn: 'Paraguay', nameAr: 'باراغواي' },
    { code: 'PE', flag: '🇵🇪', nameEn: 'Peru', nameAr: 'بيرو' },
    { code: 'SR', flag: '🇸🇷', nameEn: 'Suriname', nameAr: 'سورينام' },
    { code: 'TT', flag: '🇹🇹', nameEn: 'Trinidad and Tobago', nameAr: 'ترينيداد وتوباغو' },
    { code: 'US', flag: '🇺🇸', nameEn: 'United States', nameAr: 'الولايات المتحدة' },
    { code: 'UY', flag: '🇺🇾', nameEn: 'Uruguay', nameAr: 'أوروغواي' },
    { code: 'VE', flag: '🇻🇪', nameEn: 'Venezuela', nameAr: 'فنزويلا' },

    // Africa
    { code: 'AO', flag: '🇦🇴', nameEn: 'Angola', nameAr: 'أنغولا' },
    { code: 'BJ', flag: '🇧🇯', nameEn: 'Benin', nameAr: 'بنين' },
    { code: 'BW', flag: '🇧🇼', nameEn: 'Botswana', nameAr: 'بوتسوانا' },
    { code: 'BF', flag: '🇧🇫', nameEn: 'Burkina Faso', nameAr: 'بوركينا فاسو' },
    { code: 'BI', flag: '🇧🇮', nameEn: 'Burundi', nameAr: 'بوروندي' },
    { code: 'CM', flag: '🇨🇲', nameEn: 'Cameroon', nameAr: 'الكاميرون' },
    { code: 'CV', flag: '🇨🇻', nameEn: 'Cape Verde', nameAr: 'الرأس الأخضر' },
    { code: 'CF', flag: '🇨🇫', nameEn: 'Central African Republic', nameAr: 'أفريقيا الوسطى' },
    { code: 'TD', flag: '🇹🇩', nameEn: 'Chad', nameAr: 'تشاد' },
    { code: 'CG', flag: '🇨🇬', nameEn: 'Congo', nameAr: 'الكونغو' },
    { code: 'CD', flag: '🇨🇩', nameEn: 'DR Congo', nameAr: 'الكونغو الديمقراطية' },
    { code: 'GQ', flag: '🇬🇶', nameEn: 'Equatorial Guinea', nameAr: 'غينيا الاستوائية' },
    { code: 'ER', flag: '🇪🇷', nameEn: 'Eritrea', nameAr: 'إريتريا' },
    { code: 'SZ', flag: '🇸🇿', nameEn: 'Eswatini', nameAr: 'إيسواتيني' },
    { code: 'ET', flag: '🇪🇹', nameEn: 'Ethiopia', nameAr: 'إثيوبيا' },
    { code: 'GA', flag: '🇬🇦', nameEn: 'Gabon', nameAr: 'الغابون' },
    { code: 'GM', flag: '🇬🇲', nameEn: 'Gambia', nameAr: 'غامبيا' },
    { code: 'GH', flag: '🇬🇭', nameEn: 'Ghana', nameAr: 'غانا' },
    { code: 'GN', flag: '🇬🇳', nameEn: 'Guinea', nameAr: 'غينيا' },
    { code: 'GW', flag: '🇬🇼', nameEn: 'Guinea-Bissau', nameAr: 'غينيا بيساو' },
    { code: 'CI', flag: '🇨🇮', nameEn: 'Ivory Coast', nameAr: 'ساحل العاج' },
    { code: 'KE', flag: '🇰🇪', nameEn: 'Kenya', nameAr: 'كينيا' },
    { code: 'LS', flag: '🇱🇸', nameEn: 'Lesotho', nameAr: 'ليسوتو' },
    { code: 'LR', flag: '🇱🇷', nameEn: 'Liberia', nameAr: 'ليبيريا' },
    { code: 'MG', flag: '🇲🇬', nameEn: 'Madagascar', nameAr: 'مدغشقر' },
    { code: 'MW', flag: '🇲🇼', nameEn: 'Malawi', nameAr: 'ملاوي' },
    { code: 'ML', flag: '🇲🇱', nameEn: 'Mali', nameAr: 'مالي' },
    { code: 'MU', flag: '🇲🇺', nameEn: 'Mauritius', nameAr: 'موريشيوس' },
    { code: 'MZ', flag: '🇲🇿', nameEn: 'Mozambique', nameAr: 'موزمبيق' },
    { code: 'NA', flag: '🇳🇦', nameEn: 'Namibia', nameAr: 'ناميبيا' },
    { code: 'NE', flag: '🇳🇪', nameEn: 'Niger', nameAr: 'النيجر' },
    { code: 'NG', flag: '🇳🇬', nameEn: 'Nigeria', nameAr: 'نيجيريا' },
    { code: 'RW', flag: '🇷🇼', nameEn: 'Rwanda', nameAr: 'رواندا' },
    { code: 'SN', flag: '🇸🇳', nameEn: 'Senegal', nameAr: 'السنغال' },
    { code: 'SC', flag: '🇸🇨', nameEn: 'Seychelles', nameAr: 'سيشل' },
    { code: 'SL', flag: '🇸🇱', nameEn: 'Sierra Leone', nameAr: 'سيراليون' },
    { code: 'ZA', flag: '🇿🇦', nameEn: 'South Africa', nameAr: 'جنوب أفريقيا' },
    { code: 'SS', flag: '🇸🇸', nameEn: 'South Sudan', nameAr: 'جنوب السودان' },
    { code: 'TZ', flag: '🇹🇿', nameEn: 'Tanzania', nameAr: 'تنزانيا' },
    { code: 'TG', flag: '🇹🇬', nameEn: 'Togo', nameAr: 'توغو' },
    { code: 'UG', flag: '🇺🇬', nameEn: 'Uganda', nameAr: 'أوغندا' },
    { code: 'ZM', flag: '🇿🇲', nameEn: 'Zambia', nameAr: 'زامبيا' },
    { code: 'ZW', flag: '🇿🇼', nameEn: 'Zimbabwe', nameAr: 'زيمبابوي' }
  ];

  public profileForm: FormGroup = this.fb.group({
    dateOfBirth: ['', [Validators.required]],
    bloodType: [BloodType.Unknown, [Validators.required]],
    nationalId: ['', [Validators.required, Validators.pattern(/^[0-9a-zA-Z]{5,20}$/)]],
    nationality: ['', [Validators.required, Validators.minLength(2)]],
    maritalStatus: [MaritalStatus.SINGLE, [Validators.required]],
    emergencyContactName: ['', [Validators.required]],
    emergencyContactPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 \-]{7,20}$/)]],
    notes: ['']
  });

  ngOnInit(): void {
    this.initAccountData();
    this.loadProfile();
  }

  initAccountData(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.accountForm.patchValue({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'MALE',
        preferredLang: user.preferredLang || 'en'
      });
    }
    this.accountForm.disable();
  }

  enableAccountEdit(): void {
    this.isEditingAccount = true;
    this.accountForm.enable();
  }

  cancelAccountEdit(): void {
    this.isEditingAccount = false;
    this.stagedAvatarFile = null;
    this.stagedAvatarPreviewUrl = null;
    this.initAccountData();
  }

  triggerAvatarUpload(): void {
    if (this.avatarInput) {
      this.avatarInput.nativeElement.click();
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.uiService.showError(this.languageService.translate('Image size should be less than 5MB.', 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت.'));
      return;
    }

    this.stagedAvatarFile = file;
    this.stagedAvatarPreviewUrl = URL.createObjectURL(file);
    this.isEditingAccount = true;
    this.accountForm.enable();
    this.uiService.showInfo(this.languageService.translate('Photo selected. Click "Save Account Info" to upload.', 'تم تحديد الصورة. اضغط "حفظ معلومات الحساب" للرفع.'));
  }

  saveAccountInfo(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const dto = this.accountForm.value;

    this.userService.updateProfile(this.stagedAvatarFile, dto).subscribe({
      next: (updatedUser) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess(this.languageService.translate('User account details and avatar saved successfully!', 'تم حفظ بيانات الحساب وصورة البروفايل بنجاح!'));
        this.isEditingAccount = false;
        this.stagedAvatarFile = null;
        this.stagedAvatarPreviewUrl = null;
        this.accountForm.disable();
      },
      error: (err) => {
        this.uiService.hideLoading();
        const msg = err?.error?.message || err?.error?.error || this.languageService.translate('Failed to update account details.', 'فشل في تحديث بيانات الحساب.');
        this.uiService.showError(msg);
      }
    });
  }

  loadProfile(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (profile) => {
        this.uiService.hideLoading();
        this.profileExists = true;
        this.profileForm.patchValue(profile);
        this.profileForm.disable(); // Read-only by default
      },
      error: (err) => {
        this.uiService.hideLoading();
        const errorMessage = err.error?.message || '';
        if (err.status === 404 || errorMessage.includes('not found')) {
          this.profileExists = false;
          this.isEditMode = true; // Automatically edit for creation
          this.profileForm.enable();
        } else {
          this.uiService.showError(this.languageService.translate('Could not load patient profile.', 'تعذر تحميل ملف المريض.'));
        }
      }
    });
  }

  enableEdit(): void {
    this.isEditMode = true;
    this.profileForm.enable();
  }

  cancelEdit(): void {
    if (this.profileExists) {
      this.isEditMode = false;
      this.profileForm.disable();
      this.loadProfile(); // reload original values
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const payload = this.profileForm.value;

    if (this.profileExists) {
      this.patientService.updateProfile(payload).subscribe({
        next: (res) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Medical profile updated successfully.', 'تم تحديث الملف الطبي بنجاح.'));
          this.isEditMode = false;
          this.profileForm.disable();
          this.profileForm.patchValue(res);
        },
        error: (err) => {
          this.uiService.hideLoading();
          this.uiService.showError(err.error?.message || this.languageService.translate('Failed to update medical profile.', 'فشل في تحديث الملف الطبي.'));
        }
      });
    } else {
      this.patientService.createProfile(payload).subscribe({
        next: (res) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Medical profile initialized successfully.', 'تم إنشاء الملف الطبي بنجاح.'));
          this.profileExists = true;
          this.isEditMode = false;
          this.profileForm.disable();
          this.profileForm.patchValue(res);
        },
        error: (err) => {
          this.uiService.hideLoading();
          this.uiService.showError(err.error?.message || this.languageService.translate('Failed to initialize medical profile.', 'فشل في إنشاء الملف الطبي.'));
        }
      });
    }
  }
}

