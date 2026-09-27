// My Days Daily Reports Dataset matching OneRoot CRM
// Records sales team daily activity reports, lead touches, status changes, and remarks

export const TEAM_MEMBERS = [
  'All users',
  'Bhavana',
  'Dan',
  'David',
  'Pavithra',
  'Preetham',
  'Rahul',
  'Rohan',
  'Sanju',
  'Shiva',
  'aarav',
  'adric'
];

export const INITIAL_MY_DAYS_REPORTS = [
  {
    id: 'report_1',
    date: 'Sat, Sep 26, 2026',
    date_iso: '2026-09-26',
    user: 'Shiva',
    leads: 4,
    status: 0,
    reassign: 0,
    remarks: 0,
    updated: 'Sep 26, 2026 5:20 PM',
    summary: 'Focused on southern poultry feed mills & maize sourcing inquiries',
    tasks: [
      {
        lead_name: 'Provit Foods Private Limited',
        contact: 'Anupama',
        time: '05:20 PM',
        action: 'Call Initiated & Price Discussion',
        note: 'Buying at Rannebennur Rs 2720 Per Kg. Discussed 50 MT delivery schedule.',
        status: 'Requirement Understood'
      },
      {
        lead_name: 'Gujarat Ambuja Exports Limited',
        contact: 'Sharma',
        time: '05:15 PM',
        action: 'Call Initiated',
        note: 'Buying at Rs 26 Per Kg. Follow up on Tuesday for payment terms.',
        status: 'Contact Established'
      },
      {
        lead_name: 'Prabhrit Ethanol Private Limited',
        contact: 'Praveen',
        time: '01:04 PM',
        action: 'Follow-up Call',
        note: 'Buying at Rs 26 Per Kg. Inquired about Rice DDGS delivery at plant.',
        status: 'Contact Established'
      },
      {
        lead_name: 'Kwality Feeds Pvt Ltd',
        contact: 'Praveen',
        time: '12:26 PM',
        action: 'Call Initiated',
        note: 'Buying at Rs 26.50 Per Kg. Verified quality specs for DORB.',
        status: 'Requirement Understood'
      }
    ]
  },
  {
    id: 'report_2',
    date: 'Sat, Sep 26, 2026',
    date_iso: '2026-09-26',
    user: 'adric',
    leads: 0,
    status: 0,
    reassign: 0,
    remarks: 0,
    updated: 'Sep 26, 2026 11:42 AM',
    summary: 'Reviewed weekend pending shipping documents and port clearance files',
    tasks: [
      {
        lead_name: 'Cat Lai Port Logistics Desk',
        contact: 'Port Officer Minh',
        time: '11:42 AM',
        action: 'Documentation Review',
        note: 'Verified container arrival schedule for Vietnam inbound shipments.',
        status: 'Completed'
      }
    ]
  },
  {
    id: 'report_3',
    date: 'Fri, Sep 25, 2026',
    date_iso: '2026-09-25',
    user: 'adric',
    leads: 0,
    status: 0,
    reassign: 0,
    remarks: 5,
    updated: 'Sep 25, 2026 1:45 PM',
    summary: 'Updated Vietnamese market notes and price parity across 5 feedmill accounts',
    tasks: [
      {
        lead_name: 'Emivest Feedmill Vietnam Co., Ltd',
        contact: 'Thanh Tuan',
        time: '01:45 PM',
        action: 'Remark Logged',
        note: 'Discussed protein and moisture specs for 1000 MT Rice DDGS. Waiting on sample certificate.',
        status: 'Requirement Understood'
      },
      {
        lead_name: 'Hong Ha Nutrition',
        contact: 'Mrs Thuy',
        time: '01:20 PM',
        action: 'Remark Logged',
        note: 'Quotation sent CIF Hai Phong port. Waiting for internal procurement board sign-off.',
        status: 'Quotation Sent'
      },
      {
        lead_name: 'Tuong Van Service And Trading Co.',
        contact: 'Mr Van',
        time: '11:15 AM',
        action: 'Remark Logged',
        note: 'Client requested CAD payment terms instead of LC at sight.',
        status: 'Requirement Understood'
      },
      {
        lead_name: 'Binh Minh Import & Export Corp',
        contact: 'Ms Linh',
        time: '10:30 AM',
        action: 'Remark Logged',
        note: 'Inquired on container freight rates from Chennai port to Jakarta.',
        status: 'Contact Established'
      },
      {
        lead_name: 'Nhan Loc Company Limited',
        contact: 'Mr Loc',
        time: '09:45 AM',
        action: 'Remark Logged',
        note: 'Needs 45 MT high-curcumin finger turmeric double polished.',
        status: 'Contact Established'
      }
    ]
  },
  {
    id: 'report_4',
    date: 'Thu, Sep 24, 2026',
    date_iso: '2026-09-24',
    user: 'adric',
    leads: 0,
    status: 1,
    reassign: 0,
    remarks: 5,
    updated: 'Sep 24, 2026 3:27 PM',
    summary: 'Moved Cat Phu Sa account to Closed Lost; logged outreach notes',
    tasks: [
      {
        lead_name: 'Cat Phu Sa Joint Stock Company',
        contact: 'Mr Duy',
        time: '03:27 PM',
        action: 'Status Change & Remarks',
        note: 'they closed animal feed business. Moved to Closed Lost.',
        status: 'Closed Lost'
      },
      {
        lead_name: 'Huong Hoang Nam Company Limited',
        contact: 'Director Nam',
        time: '02:10 PM',
        action: 'Remark Logged',
        note: 'Requested fresh sample photos of Nizamabad turmeric bulbs.',
        status: 'Contact Established'
      },
      {
        lead_name: 'VietSpices Import & Distribution Co.',
        contact: 'Nguyen Van Minh',
        time: '01:30 PM',
        action: 'Remark Logged',
        note: 'Price expectation is $1,850/MT CIF Ho Chi Minh.',
        status: 'Requirement Understood'
      },
      {
        lead_name: 'Dap Cau Agri-Product Ltd',
        contact: 'Mr Cuong',
        time: '11:00 AM',
        action: 'Remark Logged',
        note: 'Evaluating corn DDGS alternatives due to local starch availability.',
        status: 'Contact Established'
      },
      {
        lead_name: 'Phu Tai Feed Mill JSC',
        contact: 'Ms Trang',
        time: '10:15 AM',
        action: 'Remark Logged',
        note: 'Sent introductory company credentials and export track record.',
        status: 'Lead Generation'
      }
    ]
  },
  {
    id: 'report_5',
    date: 'Wed, Sep 23, 2026',
    date_iso: '2026-09-23',
    user: 'Shiva',
    leads: 4,
    status: 0,
    reassign: 0,
    remarks: 0,
    updated: 'Sep 23, 2026 4:48 PM',
    summary: 'Logged 4 new agri inquiries from Hyderabad and Maharashtra grain dealers',
    tasks: [
      {
        lead_name: 'Sneha Farms Private Limited',
        contact: 'Ram Reddy',
        time: '04:48 PM',
        action: 'New Lead Added',
        note: 'Direct procurement inquiry for 100 MT yellow maize monthly.',
        status: 'Lead Generation'
      },
      {
        lead_name: 'Shree Renuka Agro Industries',
        contact: 'Patil',
        time: '03:15 PM',
        action: 'New Lead Added',
        note: 'Requirement for DORB (De-Oiled Rice Bran) bulk loose.',
        status: 'Lead Generation'
      },
      {
        lead_name: 'Kisan Bio Nutrients',
        contact: 'Suresh Kumar',
        time: '01:30 PM',
        action: 'New Lead Added',
        note: 'Evaluating spot rates for soybean meal RSM.',
        status: 'Lead Generation'
      },
      {
        lead_name: 'Balaji Animal Feeds',
        contact: 'Venkatesh',
        time: '11:00 AM',
        action: 'New Lead Added',
        note: 'Needs sample testing of Rice DDGS protein content.',
        status: 'Lead Generation'
      }
    ]
  },
  {
    id: 'report_6',
    date: 'Wed, Sep 23, 2026',
    date_iso: '2026-09-23',
    user: 'adric',
    leads: 4,
    status: 1,
    reassign: 0,
    remarks: 6,
    updated: 'Sep 23, 2026 4:09 PM',
    summary: 'Heavy Vietnam pipeline update: 4 new leads, 1 status advanced, 6 remarks',
    tasks: [
      {
        lead_name: 'An Giang Feed Processing Plant',
        contact: 'Director Hai',
        time: '04:09 PM',
        action: 'Status Change & New Lead',
        note: 'Moved to Requirement Understood. Demands 500 MT quarterly.',
        status: 'Requirement Understood'
      },
      {
        lead_name: 'Dong Thap Aqua Feeds',
        contact: 'Mr Thang',
        time: '02:50 PM',
        action: 'New Lead Added',
        note: 'Pangasius aquafeed producer exploring Indian DDGS imports.',
        status: 'Lead Generation'
      },
      {
        lead_name: 'Mekong Agri Trading Co.',
        contact: 'Ms Thao',
        time: '01:15 PM',
        action: 'Remark Logged',
        note: 'Requested payment terms CAD 30 days. Informed CAD is document release against bank only.',
        status: 'Contact Established'
      },
      {
        lead_name: 'Saigon Spice Hub Ltd',
        contact: 'Mr Long',
        time: '11:30 AM',
        action: 'Remark Logged',
        note: 'Shared specification sheet for whole finger turmeric Nizamabad.',
        status: 'Contact Established'
      }
    ]
  },
  {
    id: 'report_7',
    date: 'Tue, Sep 22, 2026',
    date_iso: '2026-09-22',
    user: 'Rohan',
    leads: 6,
    status: 2,
    reassign: 0,
    remarks: 4,
    updated: 'Sep 22, 2026 6:15 PM',
    summary: 'Malaysian and Gulf spice buyer outreach: 6 accounts touched, 2 quotes sent',
    tasks: [
      {
        lead_name: 'MMK SPICES SDN BHD',
        contact: 'Mohamed Shakir Bin Basheer Ali',
        time: '06:15 PM',
        action: 'Status Advanced',
        note: 'Discussed Salem double polish finger turmeric. Sent revised CIF Port Klang quote.',
        status: 'Quotation Sent'
      },
      {
        lead_name: 'Al-Barakah Global Agro Foods LLC',
        contact: 'Tariq Mansoor',
        time: '04:30 PM',
        action: 'Status Advanced',
        note: 'Customer confirmed LC approval with Emirates NBD bank.',
        status: 'Quotation Sent'
      },
      {
        lead_name: 'Kuala Lumpur Spice Emporium',
        contact: 'Tan Sri Lee',
        time: '02:00 PM',
        action: 'Remark Logged',
        note: 'Sent sample parcel tracking ID via DHL Express.',
        status: 'Contact Established'
      }
    ]
  },
  {
    id: 'report_8',
    date: 'Tue, Sep 22, 2026',
    date_iso: '2026-09-22',
    user: 'David',
    leads: 3,
    status: 1,
    reassign: 0,
    remarks: 2,
    updated: 'Sep 22, 2026 4:30 PM',
    summary: 'European bio-nutrition and grain import requirements call round',
    tasks: [
      {
        lead_name: 'Continental Feeds & Bio-Nutrition BV',
        contact: 'Hendrik Van Dijk',
        time: '04:30 PM',
        action: 'Status Advanced',
        note: 'Non-GMO certified Rice DDGS specifications submitted for Rotterdam customs testing.',
        status: 'Requirement Understood'
      },
      {
        lead_name: 'Antwerp Agro Commerce NV',
        contact: 'Luc Mertens',
        time: '01:45 PM',
        action: 'Remark Logged',
        note: 'Requested quotation for 3 x 40ft High Cube containers of dried ginger.',
        status: 'Contact Established'
      }
    ]
  },
  {
    id: 'report_9',
    date: 'Mon, Sep 21, 2026',
    date_iso: '2026-09-21',
    user: 'adric',
    leads: 2,
    status: 0,
    reassign: 0,
    remarks: 3,
    updated: 'Sep 21, 2026 5:10 PM',
    summary: 'Weekly kickoff calls with feed buyers in Hai Phong and Da Nang',
    tasks: [
      {
        lead_name: 'Central Vietnam Feed JSC',
        contact: 'Mr Quang',
        time: '05:10 PM',
        action: 'Call Initiated',
        note: 'Evaluating DDGS supply contract for Q4 2026.',
        status: 'Contact Established'
      },
      {
        lead_name: 'Da Nang Agro Maritime',
        contact: 'Ms Huong',
        time: '02:30 PM',
        action: 'Remark Logged',
        note: 'Requested COA (Certificate of Analysis) for heavy metals and aflatoxin.',
        status: 'Contact Established'
      }
    ]
  },
  {
    id: 'report_10',
    date: 'Mon, Sep 21, 2026',
    date_iso: '2026-09-21',
    user: 'Shiva',
    leads: 5,
    status: 1,
    reassign: 0,
    remarks: 2,
    updated: 'Sep 21, 2026 4:55 PM',
    summary: 'Reviewed 5 domestic inquiries and negotiated spot freight for maize',
    tasks: [
      {
        lead_name: 'Karnataka Feeds Consortium',
        contact: 'Gowda',
        time: '04:55 PM',
        action: 'Price Discussion',
        note: 'Finalized price at Rs 26.25 per kg ex-mill Nizamabad.',
        status: 'Negotiation'
      }
    ]
  }
];
